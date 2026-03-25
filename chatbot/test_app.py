import unittest
from unittest.mock import patch

import app as chatbot_module


class ChatbotSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = chatbot_module.app.test_client()
        chatbot_module.rate_limit_store.clear()
        chatbot_module.repeat_message_store.clear()

    def test_validate_chat_payload_rejects_empty_message(self):
        with self.assertRaises(ValueError):
            chatbot_module.validate_chat_payload({'mensaje': '   ', 'historial': []})

    def test_chat_rejects_invalid_payload(self):
        response = self.client.post('/chat', json={'mensaje': ''})
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.get_json())

    def test_chat_rate_limit_blocks_excessive_requests(self):
        original_max_requests = chatbot_module.CHAT_RATE_LIMIT_MAX_REQUESTS
        chatbot_module.CHAT_RATE_LIMIT_MAX_REQUESTS = 1
        try:
            first = self.client.post('/chat', json={'mensaje': 'promociones', 'historial': []})
            second = self.client.post('/chat', json={'mensaje': 'promociones', 'historial': []})
            self.assertEqual(first.status_code, 200)
            self.assertEqual(second.status_code, 429)
        finally:
            chatbot_module.CHAT_RATE_LIMIT_MAX_REQUESTS = original_max_requests
            chatbot_module.rate_limit_store.clear()
            chatbot_module.repeat_message_store.clear()

    def test_switch_risk_faq_returns_terms_action(self):
        response = self.client.post(
            '/chat',
            json={
                'mensaje': 'tiene riesgo de perdida o bloqueo',
                'historial': [{'from': 'user', 'text': 'sirve para nintendo switch'}],
            },
        )
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('riesgo de perdida o bloqueo', body['respuesta'].lower())
        self.assertEqual(body['acciones'][0]['type'], 'open_route')

    def test_promotions_include_pack_button(self):
        response = self.client.post('/chat', json={'mensaje': 'promociones', 'historial': []})
        body = response.get_json()
        labels = [action['label'] for action in body['acciones']]
        self.assertIn('Ver pack de juegos', labels)

    def test_payment_info_returns_structured_response(self):
        response = self.client.post('/chat', json={'mensaje': 'medios de pago', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('Chile:', body['respuesta'])
        self.assertIn('PayPal (USD)', body['respuesta'])

    def test_format_question_returns_direct_digital_answer(self):
        response = self.client.post('/chat', json={'mensaje': 'son fisicos o digitales?', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('productos digitales', body['respuesta'].lower())
        self.assertIn('no vendemos juegos fisicos', body['respuesta'].lower())

    def test_general_catalog_question_returns_categories_instead_of_catalog_miss(self):
        productos = [
            {'id': '1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch'},
            {'id': '2', 'name': 'God of War Ragnarok', 'categoryId': 'ps5'},
            {'id': '3', 'name': 'Netflix Premium', 'categoryId': 'streaming'},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps5': {'id': 'ps5', 'name': 'PS5'},
            'streaming': {'id': 'streaming', 'name': 'Streaming'},
        }

        with patch.object(chatbot_module, 'obtener_productos', return_value=productos), patch.object(chatbot_module, 'obtener_categorias', return_value=categorias):
            response = self.client.post('/chat', json={'mensaje': 'que juegos venden', 'historial': []})

        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('vendemos juegos digitales, suscripciones y streaming', body['respuesta'].lower())
        self.assertIn('nintendo switch', body['respuesta'].lower())
        self.assertNotIn('no encontre ese juego', body['respuesta'].lower())

    def test_purchase_question_returns_step_by_step_answer(self):
        response = self.client.post('/chat', json={'mensaje': 'como compro?', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('como comprar en panda store', body['respuesta'].lower())
        self.assertIn('agregalo al carrito', body['respuesta'].lower())

    def test_how_purchase_works_phrase_returns_step_by_step_answer(self):
        response = self.client.post('/chat', json={'mensaje': 'como es la compra', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('como comprar en panda store', body['respuesta'].lower())

    def test_typo_in_purchase_question_still_matches_info_intent(self):
        response = self.client.post('/chat', json={'mensaje': 'como es la conpra', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('como comprar en panda store', body['respuesta'].lower())

    def test_purchase_message_with_product_name_prefers_catalog_search(self):
        productos = [
            {'id': 'luigi-1', 'name': 'Luigis Mansion 3', 'categoryId': 'switch', 'priceCLP': 15000, 'priceUSD': 17},
            {'id': 'fc-1', 'name': 'FC 26 PS4', 'categoryId': 'ps4', 'pricePrimariaCLP': 40000, 'pricePrimariaUSD': 44},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps4': {'id': 'ps4', 'name': 'PS4'},
        }

        with patch.object(chatbot_module, 'obtener_productos', return_value=productos), patch.object(chatbot_module, 'obtener_categorias', return_value=categorias):
            response = self.client.post('/chat', json={'mensaje': 'quiero comprar luigi 3', 'historial': []})

        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(opcion.get('title', '').lower() == 'luigis mansion 3' for opcion in body.get('opciones', [])))
        self.assertNotIn('como comprar en panda store', body['respuesta'].lower())

    def test_switch_online_faq_is_fixed(self):
        response = self.client.post(
            '/chat',
            json={
                'mensaje': 'se puede jugar online',
                'historial': [{'from': 'user', 'text': 'quiero un juego de nintendo switch'}],
            },
        )
        body = response.get_json()
        self.assertEqual(body['respuesta'], 'Si, se puede jugar online.')

    def test_switch_primary_secondary_faq_is_fixed(self):
        response = self.client.post(
            '/chat',
            json={
                'mensaje': 'es primaria o secundaria',
                'historial': [{'from': 'user', 'text': 'sirve para nintendo switch'}],
            },
        )
        body = response.get_json()
        self.assertIn('solo vendemos primarias', body['respuesta'].lower())
        self.assertIn('ps4 y ps5', body['respuesta'].lower())

    def test_primary_secondary_question_works_without_previous_context(self):
        response = self.client.post('/chat', json={'mensaje': 'primaria o secundaria', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('solo vendemos primarias', body['respuesta'].lower())
        self.assertIn('ps4 y ps5', body['respuesta'].lower())

    def test_delivery_question_returns_direct_answer(self):
        response = self.client.post('/chat', json={'mensaje': 'como es la entrega', 'historial': []})
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('la entrega es digital', body['respuesta'].lower())

    def test_handoff_to_whatsapp_when_user_asks_for_person(self):
        response = self.client.post(
            '/chat',
            json={
                'mensaje': 'quiero hablar con una persona',
                'historial': [{'from': 'user', 'text': 'necesito ayuda con mi compra'}],
            },
        )
        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('wa.me', body['acciones'][0]['url'])

    def test_telemetry_rejects_unauthorized_requests_when_key_is_configured(self):
        original_key = chatbot_module.TELEMETRY_API_KEY
        chatbot_module.TELEMETRY_API_KEY = 'secret-key'
        try:
            response = self.client.post('/chat/telemetry', json={'event': 'add_to_cart'})
            self.assertEqual(response.status_code, 401)
        finally:
            chatbot_module.TELEMETRY_API_KEY = original_key

    def test_telemetry_accepts_allowed_event_with_valid_key(self):
        original_key = chatbot_module.TELEMETRY_API_KEY
        chatbot_module.TELEMETRY_API_KEY = 'secret-key'
        try:
            response = self.client.post(
                '/chat/telemetry',
                json={'event': 'add_to_cart', 'metadata': {'source': 'chatbot'}},
                headers={'X-Telemetry-Key': 'secret-key'},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {'ok': True})
        finally:
            chatbot_module.TELEMETRY_API_KEY = original_key

    def test_client_identifier_ignores_forwarded_for_without_trusted_proxy(self):
        original_trust_proxy = chatbot_module.TRUST_PROXY
        chatbot_module.TRUST_PROXY = False
        try:
            response = self.client.post(
                '/chat/telemetry',
                json={'event': 'add_to_cart'},
                headers={'X-Forwarded-For': '203.0.113.10'},
            )
            self.assertEqual(response.status_code, 200)
        finally:
            chatbot_module.TRUST_PROXY = original_trust_proxy


class ContextSelectionTests(unittest.TestCase):
    def test_context_selection_by_number_returns_selected_product_actions(self):
        productos = [
            {'id': '1', 'name': 'Mario Kart World', 'categoryId': 'switch', 'priceCLP': 25000, 'priceUSD': 27},
            {'id': '2', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 16000, 'priceUSD': 18},
        ]
        categorias = {'switch': {'id': 'switch', 'name': 'Nintendo Switch'}}
        historial = [
            {
                'from': 'bot',
                'text': 'Encontre opciones parecidas.',
                'options': chatbot_module.construir_opciones_chat(productos, categorias),
                'actions': [],
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('la 2', historial, productos, categorias)
        self.assertIsNotNone(response)
        self.assertTrue(response['acciones'] or response['opciones'])

    def test_context_selection_by_plan_month_returns_plan_actions(self):
        producto = {
            'id': 'sub-1',
            'name': 'Amazon Prime',
            'categoryId': 'subs',
            'preciosPorMes': [
                {'meses': 1, 'clp': 5000, 'usd': 5},
                {'meses': 3, 'clp': 10000, 'usd': 10},
            ],
        }
        categorias = {'subs': {'id': 'subs', 'name': 'Suscripciones'}}
        historial = [
            {
                'from': 'bot',
                'text': '',
                'options': chatbot_module.construir_opciones_chat([producto], categorias),
                'actions': [],
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('quiero la de 3 meses', historial, [producto], categorias)
        self.assertIsNotNone(response)
        labels = [action['label'] for action in response['acciones']]
        self.assertIn('Comprar ahora', labels)
        self.assertIn('Agregar al carrito', labels)

    def test_platform_follow_up_uses_previous_product_context(self):
        productos = [
            {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch', 'priceCLP': 25000, 'priceUSD': 28},
            {'id': 'ps5-1', 'name': 'FC26 PS5', 'categoryId': 'ps5', 'pricePrimariaCLP': 32000, 'pricePrimariaUSD': 35, 'priceSecundariaCLP': 22000, 'priceSecundariaUSD': 24},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps5': {'id': 'ps5', 'name': 'PS5'},
        }
        historial = [
            {
                'from': 'bot',
                'text': '',
                'options': chatbot_module.construir_opciones_chat([productos[0]], categorias),
                'actions': chatbot_module.construir_acciones_producto_unico(productos[0], categorias),
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('y para ps5?', historial, productos, categorias)
        self.assertIsNotNone(response)
        acciones = response.get('acciones', [])
        self.assertTrue(any('primaria' in (accion.get('label', '').lower()) for accion in acciones))
        self.assertIn('elige si quieres primaria o secundaria', response.get('respuesta', '').lower())

    def test_contextual_product_actions_include_variant_prices_in_labels(self):
        producto = {
            'id': 'ps5-1',
            'name': 'FC 26 PS5',
            'categoryId': 'ps5',
            'pricePrimariaCLP': 45000,
            'pricePrimariaUSD': 49,
            'priceSecundariaCLP': 35000,
            'priceSecundariaUSD': 39,
        }
        categorias = {'ps5': {'id': 'ps5', 'name': 'PS5'}}

        acciones = chatbot_module.construir_acciones_compra(producto, categorias)
        labels = [accion['label'] for accion in acciones if accion['type'] in {'buy', 'add_to_cart'}]

        self.assertTrue(any('comprar primaria -' in label.lower() for label in labels))
        self.assertTrue(any('45000' in label for label in labels))
        self.assertTrue(any('35000' in label for label in labels))

    def test_explicit_platform_title_selects_matching_option_not_base_title(self):
        productos = [
            {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch', 'priceCLP': 25000, 'priceUSD': 28},
            {'id': 'ps5-1', 'name': 'FC 26 PS5', 'categoryId': 'ps5', 'pricePrimariaCLP': 45000, 'pricePrimariaUSD': 49, 'priceSecundariaCLP': 35000, 'priceSecundariaUSD': 39},
            {'id': 'ps4-1', 'name': 'FC 26 PS4', 'categoryId': 'ps4', 'pricePrimariaCLP': 40000, 'pricePrimariaUSD': 44, 'priceSecundariaCLP': 35000, 'priceSecundariaUSD': 39},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps5': {'id': 'ps5', 'name': 'PS5'},
            'ps4': {'id': 'ps4', 'name': 'PS4'},
        }
        historial = [
            {
                'from': 'bot',
                'text': 'Encontre 3 opciones parecidas.',
                'options': chatbot_module.construir_opciones_chat(productos, categorias),
                'actions': [],
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('fc 26 ps5', historial, productos, categorias)
        self.assertIsNotNone(response)
        self.assertIn('ps5', response.get('respuesta', '').lower())
        self.assertTrue(any('primaria' in (accion.get('label', '').lower()) for accion in response.get('acciones', [])))

    def test_compact_alphanumeric_titles_match_spaced_queries(self):
        productos = [
            {'id': 'ps5-1', 'name': 'FC26 PS5', 'categoryId': 'ps5', 'pricePrimariaCLP': 32000},
            {'id': 'switch-1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 25000},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('fc 26', productos)
        self.assertEqual(len(resultados), 1)
        self.assertEqual(resultados[0]['id'], 'ps5-1')

    def test_expand_related_variants_returns_cross_platform_versions(self):
        productos = [
            {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch', 'priceCLP': 25000},
            {'id': 'ps5-1', 'name': 'FC26 PS5', 'categoryId': 'ps5', 'pricePrimariaCLP': 32000},
            {'id': 'ps4-1', 'name': 'FC 26 PS4', 'categoryId': 'ps4', 'pricePrimariaCLP': 30000},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps5': {'id': 'ps5', 'name': 'PS5'},
            'ps4': {'id': 'ps4', 'name': 'PS4'},
        }

        base = chatbot_module.buscar_productos_relevantes('fc 26', productos)
        expandidos = chatbot_module.expandir_variantes_relacionadas('fc 26', base, productos, categorias)
        self.assertEqual(len(expandidos), 3)

    def test_platform_only_message_does_not_trigger_handoff(self):
        historial = [
            {'from': 'user', 'text': 'fc 26'},
            {'from': 'user', 'text': 'para ps5'},
            {'from': 'user', 'text': 'tienen fc 26'},
            {'from': 'user', 'text': 'para ps5'},
        ]

        self.assertFalse(chatbot_module.es_consulta_para_humano('para ps5', historial))

    def test_streaming_queries_ignore_tiene_word(self):
        productos = [
            {'id': 'amz-1', 'name': 'amazon prime', 'categoryId': 'streaming', 'preciosPorMes': [{'meses': 1, 'clp': 5000, 'usd': 5}]},
            {'id': 'hbo-1', 'name': 'HBO Max', 'categoryId': 'streaming', 'preciosPorMes': [{'meses': 1, 'clp': 6000, 'usd': 6}]},
        ]

        amazon = chatbot_module.buscar_productos_relevantes('tiene amazon', productos)
        hbo = chatbot_module.buscar_productos_relevantes('tiene hbo max', productos)

        self.assertEqual(amazon[0]['id'], 'amz-1')
        self.assertEqual(hbo[0]['id'], 'hbo-1')

    def test_prime_video_maps_to_amazon_prime(self):
        productos = [
            {'id': 'amz-1', 'name': 'amazon prime', 'categoryId': 'streaming', 'preciosPorMes': [{'meses': 1, 'clp': 5000, 'usd': 5}]},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('tiene prime video', productos)
        self.assertEqual(resultados[0]['id'], 'amz-1')

    def test_mario_kart_query_ignores_greeting_and_purchase_words(self):
        productos = [
            {'id': 'mk-1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 16000},
            {'id': 'mk-2', 'name': 'Mario Kart World', 'categoryId': 'switch', 'priceCLP': 25000},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('hola quiero compra mario kart', productos)
        self.assertTrue(any(producto['id'] == 'mk-1' for producto in resultados))

    def test_mario_kart_numeric_query_ignores_greeting(self):
        productos = [
            {'id': 'mk-1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 16000},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('hola tienen mario kart 8', productos)
        self.assertEqual(resultados[0]['id'], 'mk-1')

    def test_simple_typo_can_still_match_mario_kart(self):
        productos = [
            {'id': 'mk-1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 16000},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('tienen mario akrt 8', productos)
        self.assertEqual(resultados[0]['id'], 'mk-1')

    def test_multiple_typos_still_match_product_name(self):
        productos = [
            {'id': 'mk-1', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 16000},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('mairo krat 8', productos)
        self.assertEqual(resultados[0]['id'], 'mk-1')

    def test_subscription_query_with_typos_still_matches(self):
        productos = [
            {'id': 'psplus-1', 'name': 'PlayStation Plus Deluxe', 'categoryId': 'subs', 'preciosPorMes': [{'meses': 1, 'clp': 7000}]},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('playstaton plsu delux', productos)
        self.assertEqual(resultados[0]['id'], 'psplus-1')

    def test_info_intent_detects_promotions_with_typo(self):
        self.assertEqual(chatbot_module.detectar_intencion_info('promocoines'), 'promociones')

    def test_info_intent_detects_payment_question_with_typo(self):
        self.assertEqual(chatbot_module.detectar_intencion_info('medios de pgao'), 'pagos')

    def test_platform_only_follow_up_without_unique_game_asks_for_clarification(self):
        productos = [
            {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch', 'priceCLP': 25000, 'priceUSD': 28},
            {'id': 'ps5-1', 'name': 'FC26 PS5', 'categoryId': 'ps5', 'pricePrimariaCLP': 32000},
            {'id': 'ps4-1', 'name': 'FC26 PS4', 'categoryId': 'ps4', 'pricePrimariaCLP': 30000},
        ]
        categorias = {
            'switch': {'id': 'switch', 'name': 'Nintendo Switch'},
            'ps5': {'id': 'ps5', 'name': 'PS5'},
            'ps4': {'id': 'ps4', 'name': 'PS4'},
        }
        historial = [
            {
                'from': 'bot',
                'text': 'Encontre 3 opciones parecidas.',
                'options': chatbot_module.construir_opciones_chat(productos, categorias),
                'actions': [],
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('para ps5', historial, productos, categorias)
        self.assertIsNotNone(response)
        self.assertIn('dime que juego te interesa', response.get('respuesta', '').lower())
        self.assertEqual(response.get('opciones'), [])

    def test_pos5_typo_is_treated_as_ps5_and_asks_for_clarification(self):
        productos = []
        categorias = {}
        historial = [
            {
                'from': 'bot',
                'text': 'Encontre varias opciones parecidas.',
                'options': [
                    {'title': 'Fc 26', 'subtitle': 'Nintendo Switch'},
                    {'title': 'FC26 PS4', 'subtitle': 'PS4'},
                ],
                'actions': [],
            }
        ]

        response = chatbot_module.resolver_seleccion_por_contexto('para pos5', historial, productos, categorias)
        self.assertIsNotNone(response)
        self.assertIn('ps5', response.get('respuesta', '').lower())


class PayloadSanitizationTests(unittest.TestCase):
    def test_sanitize_history_preserves_bot_interactive_context(self):
        historial = [
            {
                'from': 'bot',
                'text': '',
                'options': [
                    {
                        'title': 'Fc 26',
                        'subtitle': 'Nintendo Switch',
                        'action': {
                            'type': 'add_to_cart',
                            'label': 'Agregar al carrito',
                            'producto': {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch'},
                        },
                    }
                ],
                'actions': [
                    {'type': 'buy', 'label': 'Comprar ahora', 'producto': {'id': 'switch-1', 'name': 'Fc 26', 'categoryId': 'switch'}},
                    {'type': 'go_to_cart', 'label': 'Ir al carrito'},
                ],
            }
        ]

        sanitized = chatbot_module.sanitize_history(historial)
        self.assertEqual(len(sanitized), 1)
        self.assertTrue(sanitized[0]['options'])
        self.assertTrue(sanitized[0]['actions'])


class CatalogRuleTests(unittest.TestCase):
    def test_plan_selector_is_created_for_multi_month_subscription(self):
        producto = {
            'id': 'sub-2',
            'name': 'Nintendo Membresia',
            'categoryId': 'subs',
            'preciosPorMes': [
                {'meses': 3, 'clp': 12000, 'usd': 14},
                {'meses': 12, 'clp': 25000, 'usd': 28},
            ],
        }
        categorias = {'subs': {'id': 'subs', 'name': 'Suscripciones'}}
        options = chatbot_module.construir_opciones_chat([producto], categorias)
        self.assertEqual(len(options), 1)
        self.assertIn('plans', options[0])
        self.assertEqual(len(options[0]['plans']), 2)

    def test_simple_product_card_is_kept_for_single_price_product(self):
        producto = {
            'id': 'game-1',
            'name': 'Super Smash Bros Ultimate',
            'categoryId': 'switch',
            'priceCLP': 16000,
            'priceUSD': 18,
        }
        categorias = {'switch': {'id': 'switch', 'name': 'Nintendo Switch'}}
        options = chatbot_module.construir_opciones_chat([producto], categorias)
        self.assertIn('action', options[0])
        self.assertEqual(options[0]['action']['type'], 'add_to_cart')

    def test_search_rejects_weak_matches_for_missing_title(self):
        productos = [
            {'id': '1', 'name': 'Super Mario Maker 2', 'categoryId': 'switch', 'priceCLP': 16000, 'priceUSD': 18},
            {'id': '2', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 15000, 'priceUSD': 17},
            {'id': '3', 'name': 'Luigis Mansion 3', 'categoryId': 'switch', 'priceCLP': 15000, 'priceUSD': 17},
        ]

        resultados = chatbot_module.buscar_productos_relevantes('mario galaxy 2', productos)
        self.assertEqual(resultados, [])

    def test_chat_redirects_to_admin_when_title_is_not_in_catalog(self):
        productos = [
            {'id': '1', 'name': 'Super Mario Maker 2', 'categoryId': 'switch', 'priceCLP': 16000, 'priceUSD': 18},
            {'id': '2', 'name': 'Mario Kart 8 Deluxe', 'categoryId': 'switch', 'priceCLP': 15000, 'priceUSD': 17},
        ]
        categorias = {'switch': {'id': 'switch', 'name': 'Nintendo Switch'}}
        client = chatbot_module.app.test_client()

        with patch.object(chatbot_module, 'obtener_productos', return_value=productos), patch.object(chatbot_module, 'obtener_categorias', return_value=categorias):
            response = client.post('/chat', json={'mensaje': 'mario galaxy 2', 'historial': []})

        body = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertIn('no encontre ese juego en la base de datos', body['respuesta'].lower())
        self.assertTrue(body['acciones'])


if __name__ == '__main__':
    unittest.main()
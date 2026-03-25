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


if __name__ == '__main__':
    unittest.main()
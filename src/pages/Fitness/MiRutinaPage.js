import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './MiRutinaPage.css';

// Base CDN URL para imágenes de ejercicios verificadas (alta calidad)
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const DAYS_DATA = [
  {
    id: 'lunes',
    dayIndex: 1, // Lunes
    title: 'Lunes: Pecho Potencia + Tríceps + V-Line Abdomen',
    shortName: 'Lunes',
    focus: 'Pecho, Tríceps & Abdomen Inferior',
    tagColor: '#ef4444',
    duration: '75 - 85 min',
    intensity: 'Alta',
    calories: '~480 kcal',
    description: 'Enfoque en construir masa muscular en el pectoral con la banca plana y la máquina Atletis, seguido de tríceps con barra Z y activación de la V abdominal.',
    exercises: [
      {
        id: 'lunes-1',
        name: 'Press de Banca Plano con Barra',
        equipment: 'Banco Plano + Rack + Barra Recta + Discos',
        target: 'Pectoral Mayor, Deltoides Anterior, Tríceps',
        sets: 4,
        reps: '8 - 10 reps',
        rest: 90,
        imgId: 'Barbell_Bench_Press_-_Medium_Grip',
        tip: 'Retrae las escápulas (junta los omóplatos contra el banco), pies firmes en el suelo, baja la barra controlada al esternón medio y empuja explosivo sin bloquear los codos bruscamente.'
      },
      {
        id: 'lunes-2',
        name: 'Aperturas Peck Deck (Mariposa en Atletis)',
        equipment: 'Máquina Atletis (Brazos Mariposa)',
        target: 'Aislamiento Pectoral y Separación Esternal',
        sets: 3,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Butterfly',
        tip: 'Mantén los codos a la altura del pecho con ligera flexión. Junta los brazos sintiendo cómo se aprieta el centro del pecho y aguanta 1 segundo la contracción en cada repetición.'
      },
      {
        id: 'lunes-3',
        name: 'Press Plano con Mancuernas',
        equipment: 'Banco Plano + 2 Mancuernas Grandes',
        target: 'Pectoral Completo y Estabilizadores',
        sets: 3,
        reps: '10 - 12 reps',
        rest: 60,
        imgId: 'Dumbbell_Bench_Press',
        tip: 'Permite un rango de movimiento más profundo que la barra para estirar las fibras del pecho. Al subir, junta las mancuernas en la parte alta sin chocarlas.'
      },
      {
        id: 'lunes-4',
        name: 'Jalón de Tríceps en Polea Alta Atletis',
        equipment: 'Máquina Atletis - Polea Alta con Barra',
        target: 'Tríceps (Cabeza Lateral y Medial)',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Triceps_Pushdown',
        tip: 'Pega los codos a los costados y no permitas que se muevan hacia adelante ni hacia atrás. Extiende completamente los brazos hacia abajo y aprieta el tríceps.'
      },
      {
        id: 'lunes-5',
        name: 'Press Francés con Barra Curva EZ (Skullcrusher)',
        equipment: 'Banco Plano + Barra Curva EZ + Discos',
        target: 'Tríceps (Cabeza Larga - Masa del brazo)',
        sets: 3,
        reps: '10 - 12 reps',
        rest: 60,
        imgId: 'EZ-Bar_Skullcrusher',
        tip: 'Acostado en el banco plano, sujeta la barra EZ en los agarres curvos. Flexiona únicamente los codos bajando la barra hacia la frente/coronilla y extiende sin mover los hombros.'
      },
      {
        id: 'lunes-6',
        name: 'Elevación de Rodillas al Pecho en Torre Vertical',
        equipment: 'Torre de Abdominales (Apoyo de Antebrazos)',
        target: 'Abdomen Inferior y Canal Inguinal (Marcar la V)',
        sets: 4,
        reps: '15 - 20 reps',
        rest: 45,
        imgId: 'Hanging_Leg_Raise',
        tip: 'Apoya bien los antebrazos y la espalda en la almohadilla. Sube las rodillas hasta el pecho contrayendo la pelvis. No balancees el cuerpo con impulso.'
      },
      {
        id: 'lunes-7',
        name: 'Crunches en Banco Declinado',
        equipment: 'Banco Declinado de Abdominales',
        target: 'Recto Abdominal Superior y Medio',
        sets: 3,
        reps: '15 - 20 reps',
        rest: 45,
        imgId: 'Decline_Crunch',
        tip: 'Traba los pies en los rodillos de seguridad. Sube enrollando el torso vértebra por vértebra expulsando todo el aire al contraer. Baja lento sin tocar la espalda del todo abajo.'
      },
      {
        id: 'lunes-8',
        name: 'Cardio Final Quema-Grasa: Bici Estática (HIIT)',
        equipment: 'Bicicleta Estática',
        target: 'Oxidación Acelerada de Grasa Corporal (EPOC)',
        sets: 1,
        reps: '15 minutos (Intervalos)',
        rest: 30,
        imgId: 'Bicycling_Stationary',
        tip: 'Protocolo HIIT: 3 min pedaleo suave + 8 rondas de [30 segundos sprint máxima intensidad + 45 segundos pedaleo suave] + 2 min enfriamiento. Este protocolo vacía el glucógeno y fuerza la quema del rollo abdominal.'
      }
    ]
  },
  {
    id: 'martes',
    dayIndex: 2, // Martes
    title: 'Martes: Espalda Ancha + Bíceps + Oblicuos Cintura',
    shortName: 'Martes',
    focus: 'Espalda (Amplitud en V), Bíceps & Oblicuos',
    tagColor: '#3b82f6',
    duration: '75 - 85 min',
    intensity: 'Alta',
    calories: '~470 kcal',
    description: 'Enfoque en crear la espalda en forma de V para que la cintura se vea visualmente mucho más estrecha, brazos fuertes y trabajo de oblicuos.',
    exercises: [
      {
        id: 'martes-1',
        name: 'Jalón al Pecho en Polea Alta Atletis',
        equipment: 'Máquina Atletis - Polea Alta con Barra Ancha',
        target: 'Dorsal Ancho (Amplitud en V de la espalda)',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 75,
        imgId: 'Wide-Grip_Lat_Pulldown',
        tip: 'Agarre más ancho que los hombros. Inclina el torso levemente hacia atrás y tira de la barra hacia la parte superior del pecho pensando en llevar los codos hacia abajo y atrás.'
      },
      {
        id: 'martes-2',
        name: 'Remo Sentado en Polea Baja Atletis',
        equipment: 'Máquina Atletis - Polea Baja con Barra / Agarre',
        target: 'Dorsal Medio, Romboides, Trapecio (Grosor)',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 75,
        imgId: 'Seated_Cable_Rows',
        tip: 'Pies firmes en la placa inferior, pecho erguido y espalda recta. Tira del agarre hacia el ombligo apretando los omóplatos durante 1 segundo al final del recorrido.'
      },
      {
        id: 'martes-3',
        name: 'Remo Unilateral con Mancuerna en Banco Plano',
        equipment: 'Banco Plano + 1 Mancuerna Pesada',
        target: 'Dorsal Aislado, Redondo Mayor',
        sets: 3,
        reps: '10 - 12 reps por brazo',
        rest: 60,
        imgId: 'One-Arm_Dumbbell_Row',
        tip: 'Apoya una rodilla y mano sobre el banco plano. Espalda paralela al suelo. Eleva la mancuerna llevando el codo hacia la cadera, no hacia el pecho, para activar 100% el dorsal.'
      },
      {
        id: 'martes-4',
        name: 'Curl de Bíceps con Barra Curva EZ',
        equipment: 'Barra Curva EZ de Pie + Discos',
        target: 'Bíceps Braquial (Pico y Volumen del Bíceps)',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 60,
        imgId: 'EZ-Bar_Curl',
        tip: 'La curvatura ergonómica de la barra EZ cuida tus muñecas. Mantén los codos pegados a la cadera, sube apretando el bíceps y desciende controlando 3 segundos la bajada.'
      },
      {
        id: 'martes-5',
        name: 'Curl Martillo con Mancuernas',
        equipment: '2 Mancuernas Medianas',
        target: 'Braquial Anterior y Antebrazo (Grosor lateral del brazo)',
        sets: 3,
        reps: '12 reps alternadas por brazo',
        rest: 60,
        imgId: 'Hammer_Curls',
        tip: 'Agarre neutro (las palmas se miran entre sí). Este ejercicio empuja el bíceps hacia arriba haciendo que el brazo se vea significativamente más ancho de perfil.'
      },
      {
        id: 'martes-6',
        name: 'Giros Rusos en Banco Declinado con Disco (Russian Twist)',
        equipment: 'Banco Declinado + Disco de 5kg o 10kg',
        target: 'Oblicuos y Serratos (Marcar laterales del abdomen)',
        sets: 4,
        reps: '20 giros totales (10 por lado)',
        rest: 45,
        imgId: 'Cable_Russian_Twists',
        tip: 'Mantén el torso a 45 grados en el banco. Gira el torso completo de un lado al otro llevando el disco con control muscular, sintiendo la contracción en los oblicuos.'
      },
      {
        id: 'martes-7',
        name: 'Cardio Moderado Quema-Grasa: Bici Estática',
        equipment: 'Bicicleta Estática',
        target: 'Quema de Ácidos Grasos Libres',
        sets: 1,
        reps: '15 minutos ritmo constante',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: 'Cadencia constante (70-80 RPM) a resistencia media. Mantén respiración nasal controlada para oxidar grasas sin sobrecargar las piernas.'
      }
    ]
  },
  {
    id: 'miercoles',
    dayIndex: 3, // Miércoles
    title: 'Miércoles: Piernas Completas + Glúteos + Core Estabilidad',
    shortName: 'Miércoles',
    focus: 'Cuádriceps, Femoral, Gemelos & Transverso',
    tagColor: '#10b981',
    duration: '80 - 90 min',
    intensity: 'Muy Alta',
    calories: '~540 kcal',
    description: 'Entrenar piernas grandes es el factor #1 para acelerar el metabolismo y quemar la grasa visceral abdominal gracias a la gran masa muscular implicada.',
    exercises: [
      {
        id: 'miercoles-1',
        name: 'Sentadillas Profundas con Barra o Mancuernas',
        equipment: 'Barra Recta con Soporte / 2 Mancuernas Pesadas',
        target: 'Cuádriceps, Glúteos, Cadena Posterior, Core',
        sets: 4,
        reps: '8 - 10 reps',
        rest: 90,
        imgId: 'Barbell_Full_Squat',
        tip: 'Pies al ancho de hombros con puntas ligeramente hacia afuera. Baja la cadera rompiendo el paralelo de las rodillas con la espalda recta y el abdomen firme.'
      },
      {
        id: 'miercoles-2',
        name: 'Extensión de Cuádriceps en Máquina Atletis',
        equipment: 'Multigimnasio Atletis - Módulo Frontal de Piernas',
        target: 'Aislamiento de Cuádriceps (Definición Muscular)',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Leg_Extensions',
        tip: 'Siéntate con la espalda bien pegada al respaldo. Extiende las piernas y aguanta 1 segundo arriba sintiendo el ardor en el cuádriceps antes de bajar lento.'
      },
      {
        id: 'miercoles-3',
        name: 'Peso Muerto Rumano con Barra o Mancuernas',
        equipment: 'Barra Recta con Discos / 2 Mancuernas Pesadas',
        target: 'Isquiotibiales (Femoral), Glúteo Mayor, Lumbar',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 75,
        imgId: 'Romanian_Deadlift',
        tip: 'Rodillas semi-flexionadas bloqueadas en esa posición. Empuja el trasero hacia atrás sintiendo un gran estiramiento detrás de los muslos (femorales) y sube empujando con los glúteos.'
      },
      {
        id: 'miercoles-4',
        name: 'Zancadas / Estocadas Caminando con Mancuernas',
        equipment: '2 Mancuernas Medianas + Colchoneta',
        target: 'Cuádriceps, Glúteos y Coordinación Unilateral',
        sets: 3,
        reps: '10 pasos por pierna (20 totales)',
        rest: 60,
        imgId: 'Dumbbell_Lunges',
        tip: 'Da un paso largo hacia adelante, la rodilla trasera casi roza el suelo formando un ángulo de 90 grados en ambas piernas. Mantén el torso erguido.'
      },
      {
        id: 'miercoles-5',
        name: 'Elevación de Gemelos de Pie con Mancuernas',
        equipment: '2 Mancuernas + Escalón o Disco en el suelo',
        target: 'Pantorrillas (Gastrocnemio y Sóleo)',
        sets: 4,
        reps: '15 - 20 reps',
        rest: 45,
        imgId: 'Standing_Calf_Raises',
        tip: 'Apoya las puntas de los pies en el borde de un disco de 20kg en el suelo para mayor rango. Sube lo más alto posible en puntillas y baja estirando el talón.'
      },
      {
        id: 'miercoles-6',
        name: 'Plancha Abdominal Isométrica en Colchoneta',
        equipment: 'Colchoneta',
        target: 'Transverso Abdominal (Mete la panza y ajusta la cintura)',
        sets: 3,
        reps: '45 - 60 segundos por serie',
        rest: 45,
        imgId: 'Plank',
        tip: 'Apóyate en los antebrazos y puntas de pie. Aprieta glúteos y abdomen como si te fueran a dar un puñetazo. No permitas que la cadera caiga ni se eleve de más.'
      },
      {
        id: 'miercoles-7',
        name: 'Cardio Regenerativo Suave: Bici Estática',
        equipment: 'Bicicleta Estática',
        target: 'Eliminación de Ácido Láctico en Piernas',
        sets: 1,
        reps: '10 minutos muy suaves',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: 'Pedaleo muy suave sin resistencia alta para que fluya sangre a los músculos de las piernas y acelere la recuperación para el resto de la semana.'
      }
    ]
  },
  {
    id: 'jueves',
    dayIndex: 4, // Jueves
    title: 'Jueves: Hombros 3D + Trapecio + Abdomen V-Taper',
    shortName: 'Jueves',
    focus: 'Deltoides (3D), Trapecio & Core Inferior',
    tagColor: '#8b5cf6',
    duration: '70 - 80 min',
    intensity: 'Alta',
    calories: '~440 kcal',
    description: 'Hombros redondeados y anchos son el secreto estético para lograr la silueta en V masculina, reduciendo la apariencia de cintura ancha.',
    exercises: [
      {
        id: 'jueves-1',
        name: 'Press Militar Sentado con Mancuernas',
        equipment: 'Banco con Respaldo / Asiento + 2 Mancuernas',
        target: 'Deltoides Anterior y Lateral (Fuerza y Masa del Hombro)',
        sets: 4,
        reps: '8 - 10 reps',
        rest: 75,
        imgId: 'Seated_Dumbbell_Press',
        tip: 'Comienza con las mancuernas a la altura de las orejas. Empuja hacia arriba en trayectoria arqueada sin chocar las mancuernas arriba. Baja con control.'
      },
      {
        id: 'jueves-2',
        name: 'Elevaciones Laterales con Mancuernas (Hombros Anchos)',
        equipment: '2 Mancuernas Livianas / Medianas',
        target: 'Deltoides Lateral (Crea la anchura visual superior)',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Seated_Side_Lateral_Raise',
        tip: 'Codos ligeramente flexionados. Eleva los brazos hacia los costados liderando con los codos como si vertieras agua de una jarra. No uses impulso de piernas.'
      },
      {
        id: 'jueves-3',
        name: 'Face Pull en Polea Alta Atletis',
        equipment: 'Máquina Atletis - Polea Alta con Cuerda / Barra',
        target: 'Deltoides Posterior, Manguito Rotador, Postura Erguida',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Face_Pull',
        tip: 'Tira de la cuerda hacia tus ojos/frente separando los codos hacia atrás y afuera. Corrige la postura jorobada y hace que el pecho resalte hacia adelante.'
      },
      {
        id: 'jueves-4',
        name: 'Elevaciones Frontales con Mancuernas o Disco',
        equipment: 'Mancuernas o Disco de 10kg',
        target: 'Deltoides Anterior y Clavicular',
        sets: 3,
        reps: '12 reps',
        rest: 60,
        imgId: 'Front_Dumbbell_Raise',
        tip: 'Sube la carga al frente hasta la altura de la vista manteniendo los brazos rectos. Desciende resistiendo el peso.'
      },
      {
        id: 'jueves-5',
        name: 'Encogimientos de Trapecio con Mancuernas Pesadas',
        equipment: '2 Mancuernas Pesadas de Pie',
        target: 'Trapecio Superior y Cuello',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 45,
        imgId: 'Dumbbell_Shrug',
        tip: 'Eleva los hombros directamente hacia las orejas como diciendo "¿qué me importa?". Aguanta 2 segundos arriba apretando fuerte. Nunca hagas círculos con los hombros.'
      },
      {
        id: 'jueves-6',
        name: 'Elevación de Rodillas al Pecho en Torre Vertical',
        equipment: 'Torre Vertical de Abdomen',
        target: 'V-Line Abdominal Inferior',
        sets: 4,
        reps: '15 reps estrictas',
        rest: 45,
        imgId: 'Hanging_Leg_Raise',
        tip: 'Enfócate en curvar la pelvis hacia arriba para contraer los abdominales bajos. Si te resulta fácil, prueba con piernas casi estiradas.'
      },
      {
        id: 'jueves-7',
        name: 'Crunches en Banco Declinado con Disco en el Pecho',
        equipment: 'Banco Declinado + Disco de 5kg en el pecho',
        target: 'Pared Abdominal Frontal',
        sets: 3,
        reps: '15 reps',
        rest: 45,
        imgId: 'Decline_Crunch',
        tip: 'Sostén un disco de 5kg abrazado al pecho para agregar resistencia progresiva e hipertrofiar los "cuadritos" para que se noten a través de la piel.'
      },
      {
        id: 'jueves-8',
        name: 'Cardio HIIT en Bici Estática',
        equipment: 'Bicicleta Estática',
        target: 'Quema de Grasa Abdominal Post-Pesas',
        sets: 1,
        reps: '15 minutos (Sprint / Recuperación)',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: '15 min alternando 30 seg fuerte y 45 seg suave. Quema calorías por horas después de bajarte de la bici.'
      }
    ]
  },
  {
    id: 'viernes',
    dayIndex: 5, // Viernes
    title: 'Viernes: Torso Superior Power + Bombeo de Brazos',
    shortName: 'Viernes',
    focus: 'Pecho, Espalda, Bíceps, Tríceps & Serratos',
    tagColor: '#ec4899',
    duration: '75 - 85 min',
    intensity: 'Alta',
    calories: '~490 kcal',
    description: 'Sesión de bombeo y fuerza de tren superior combinando la máquina Atletis con mancuernas y barra Z para hipertrofia total antes del fin de semana.',
    exercises: [
      {
        id: 'viernes-1',
        name: 'Press de Pecho Sentado en Máquina Atletis',
        equipment: 'Multigimnasio Atletis (Módulo Press Pecho)',
        target: 'Pectoral Medio y Tríceps',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 75,
        imgId: 'Leverage_Chest_Press',
        tip: 'Ajusta la postura con el pecho inflado. Empuja con fuerza manteniendo los codos a 45 grados respecto al cuerpo para cuidar los hombros.'
      },
      {
        id: 'viernes-2',
        name: 'Jalón en Polea Alta con Agarre Supino (Palmas hacia ti)',
        equipment: 'Máquina Atletis - Polea Alta',
        target: 'Dorsal Bajo y Pico del Bíceps',
        sets: 4,
        reps: '10 - 12 reps',
        rest: 75,
        imgId: 'Wide-Grip_Lat_Pulldown',
        tip: 'Agarre al ancho de hombros con palmas mirando hacia tu cara. Tira la barra a la clavícula, excelente para ensanchar los dorsales y trabajar brazos a la vez.'
      },
      {
        id: 'viernes-3',
        name: 'Pullover con Mancuerna en Banco Plano',
        equipment: 'Banco Plano + 1 Mancuerna Mediana/Grande',
        target: 'Expansión de la Caja Torácica, Dorsales y Serratos',
        sets: 3,
        reps: '12 reps',
        rest: 60,
        imgId: 'Straight-Arm_Dumbbell_Pullover',
        tip: 'Apoya la espalda en el banco plano sosteniendo la mancuerna en forma de copa sobre tu pecho. Llévala hacia atrás de la cabeza sintiendo un gran estiramiento torácico.'
      },
      {
        id: 'viernes-4',
        name: 'SUPERSERIE BRAZOS A: Curl de Bíceps en Barra Curva EZ',
        equipment: 'Barra EZ + Discos',
        target: 'Bíceps (Cabeza Corta y Larga)',
        sets: 4,
        reps: '12 reps (Inmediato pasa al ejercicio 5)',
        rest: 0,
        imgId: 'EZ-Bar_Curl',
        tip: 'Haz 12 repeticiones estrictas con la barra Z y sin descansar ni un segundo toma la polea de tríceps.'
      },
      {
        id: 'viernes-5',
        name: 'SUPERSERIE BRAZOS B: Jalón Tríceps en Polea Alta Atletis',
        equipment: 'Máquina Atletis - Polea Alta',
        target: 'Tríceps (Bombeo Máximo)',
        sets: 4,
        reps: '12 - 15 reps',
        rest: 60,
        imgId: 'Triceps_Pushdown',
        tip: 'Extensión completa hasta abajo. Al terminar ambas series descansas 60 segundos y repites 4 rondas totales.'
      },
      {
        id: 'viernes-6',
        name: 'Giros Rusos en Banco Declinado con Disco',
        equipment: 'Banco Declinado + Disco',
        target: 'Oblicuos y Cintura',
        sets: 3,
        reps: '20 giros',
        rest: 45,
        imgId: 'Cable_Russian_Twists',
        tip: 'Giro controlado tocando casi el borde del banco a cada lado.'
      },
      {
        id: 'viernes-7',
        name: 'Cardio Bici Estática',
        equipment: 'Bicicleta Estática',
        target: 'Quema de Grasa Post-Entreno',
        sets: 1,
        reps: '15 minutos ritmo medio',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: '15 minutos pedaleo fluido constante.'
      }
    ]
  },
  {
    id: 'sabado',
    dayIndex: 6, // Sábado
    title: 'Sábado: Pierna Intensa + Glúteos + Circuito V-Cut al Fallo',
    shortName: 'Sábado',
    focus: 'Sentadillas Búlgaras, Cuádriceps & Triserie Abdominal',
    tagColor: '#f59e0b',
    duration: '75 - 85 min',
    intensity: 'Muy Alta',
    calories: '~520 kcal',
    description: 'Trabajo unilateral para corregir desbalances en piernas y glúteos, seguido de un circuito abdominal de alta densidad para quemar el tejido graso rebelde.',
    exercises: [
      {
        id: 'sabado-1',
        name: 'Sentadilla Búlgara en Banco Plano con Mancuernas',
        equipment: 'Banco Plano (Pie trasero apoyado) + 2 Mancuernas',
        target: 'Cuádriceps, Glúteos y Estabilidad Unilateral',
        sets: 3,
        reps: '10 reps por pierna',
        rest: 75,
        imgId: 'Split_Squats',
        tip: 'Coloca el empeine del pie trasero sobre el banco plano. Desciende doblando la pierna delantera hasta que el muslo quede paralelo al piso. Quema grasa masiva.'
      },
      {
        id: 'sabado-2',
        name: 'Extensión de Cuádriceps Atletis (Técnica Drop Set)',
        equipment: 'Máquina Atletis - Módulo Piernas',
        target: 'Hipertrofia de Cuádriceps al Fallo Muscular',
        sets: 3,
        reps: '10 pesadas + 8 inmediatas bajando 2 placas',
        rest: 75,
        imgId: 'Leg_Extensions',
        tip: 'Haz 10 repeticiones pesadas, cambia el pasador de peso a 2 placas menos de inmediato y haz 8 repeticiones más sin descanso para agotar todas las fibras.'
      },
      {
        id: 'sabado-3',
        name: 'Peso Muerto Rumano con Barra Recta',
        equipment: 'Barra Recta + Discos',
        target: 'Femoral, Glúteos y Espalda Baja',
        sets: 4,
        reps: '10 reps',
        rest: 75,
        imgId: 'Romanian_Deadlift',
        tip: 'Baja la barra rozando las espinillas con la espalda completamente firme y recta. Siente el estiramiento profundo en los isquiotibiales.'
      },
      {
        id: 'sabado-4',
        name: 'Elevación de Gemelos con Mancuerna a 1 Pierna',
        equipment: '1 Mancuerna + Disco en el suelo',
        target: 'Pantorrillas Aisladas',
        sets: 4,
        reps: '15 reps por pierna',
        rest: 45,
        imgId: 'Standing_Calf_Raises',
        tip: 'Sujeta una mancuerna en una mano y apóyate con la otra para no perder el equilibrio. Sube y baja con rango máximo.'
      },
      {
        id: 'sabado-5',
        name: 'TRISERIE ABDOMINAL: A) Rodillas al Pecho en Torre Vertical',
        equipment: 'Torre Vertical',
        target: 'Abdomen Bajo (V-Line)',
        sets: 3,
        reps: '15 reps (Pasa directo a B)',
        rest: 0,
        imgId: 'Hanging_Leg_Raise',
        tip: '15 elevaciones de rodillas controladas.'
      },
      {
        id: 'sabado-6',
        name: 'TRISERIE ABDOMINAL: B) Crunches en Banco Declinado',
        equipment: 'Banco Declinado',
        target: 'Recto Abdominal Frontal',
        sets: 3,
        reps: '15 reps (Pasa directo a C)',
        rest: 0,
        imgId: 'Decline_Crunch',
        tip: '15 crunches con expulsión forzada de aire.'
      },
      {
        id: 'sabado-7',
        name: 'TRISERIE ABDOMINAL: C) Plancha en Colchoneta',
        equipment: 'Colchoneta',
        target: 'Transverso y Cintura',
        sets: 3,
        reps: '45 segundos sostenidos',
        rest: 60,
        imgId: 'Plank',
        tip: 'Mantén 45 segundos apretando glúteos y abdomen. Al terminar A, B y C descansas 60 seg y repites 3 rondas.'
      },
      {
        id: 'sabado-8',
        name: 'Cardio Bici Estática HIIT',
        equipment: 'Bicicleta Estática',
        target: 'Vaciado Metabólico de Fin de Semana',
        sets: 1,
        reps: '15 minutos',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: 'Intervalos 30s duro / 30s suave.'
      }
    ]
  },
  {
    id: 'domingo',
    dayIndex: 0, // Domingo
    title: 'Domingo: Quema-Grasa Zona 2 + Vacío Abdominal & Recuperación',
    shortName: 'Domingo',
    focus: 'Cardio Quema-Grasa Zona 2, Vacío Abdominal & Estiramientos',
    tagColor: '#06b6d4',
    duration: '55 - 65 min',
    intensity: 'Moderada / Regenerativa',
    calories: '~380 kcal',
    description: 'Día clave para oxidar grasa pura sin desgastar las articulaciones ni el sistema nervioso, reducir medidas de cintura con vacío abdominal y dejar el cuerpo listo para el lunes.',
    exercises: [
      {
        id: 'domingo-1',
        name: 'Cardio Continuo Quema-Grasa Zona 2 en Bici Estática',
        equipment: 'Bicicleta Estática',
        target: 'Oxidación Máxima de Grasa Visceral y Subcutánea',
        sets: 1,
        reps: '35 - 45 minutos continuos',
        rest: 0,
        imgId: 'Bicycling_Stationary',
        tip: 'Pedalea a ritmo constante donde puedas mantener una conversación con dificultad (Zona 2, 120-135 pulsaciones por minuto). En esta zona el cuerpo utiliza un 80% de grasa como combustible directo en vez de carbohidratos.'
      },
      {
        id: 'domingo-2',
        name: 'Vacío Abdominal (Stomach Vacuum) en Colchoneta',
        equipment: 'Colchoneta',
        target: 'Músculo Transverso Abdominal (Reduce 3-5 cm de cintura)',
        sets: 5,
        reps: '15 a 20 segundos sostenidos por serie',
        rest: 45,
        imgId: 'Plank',
        tip: 'Ponte a gatas o de rodillas en la colchoneta. Bota TODO el aire de los pulmones hasta quedarte sin nada. Sin inhalar aire, mete el ombligo lo más adentro que puedas hacia la columna y aguanta 15-20 segundos. Haz 5 series. Es el mejor ejercicio del culturismo para aplanar la guata.'
      },
      {
        id: 'domingo-3',
        name: 'Sesión Guiada de Estiramiento Total en Colchoneta',
        equipment: 'Colchoneta',
        target: 'Descompresión Espinal, Femorales, Pectorales y Cadera',
        sets: 1,
        reps: '15 minutos de estiramientos estáticos suaves',
        rest: 0,
        imgId: 'Plank',
        tip: 'Estira pectorales, dorsales, flexores de cadera, cuádriceps y glúteos manteniendo cada postura 30 segundos con respiraciones profundas. Facilita la recuperación muscular.'
      }
    ]
  }
];

export default function MiRutinaPage() {
  // Día actual (0=Domingo, 1=Lunes, ..., 6=Sábado)
  const todayIndex = new Date().getDay();
  const defaultDay = DAYS_DATA.find(d => d.dayIndex === todayIndex) || DAYS_DATA[0];

  const [activeDay, setActiveDay] = useState(defaultDay);
  const [completedSets, setCompletedSets] = useState(() => {
    try {
      const saved = localStorage.getItem('pandafit_completed_sets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Temporizador de descanso
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerInitial, setTimerInitial] = useState(60);
  const audioContextRef = useRef(null);

  // Calculadora de Discos
  const [calcTargetWeight, setCalcTargetWeight] = useState(50);
  const [calcBarWeight, setCalcBarWeight] = useState(10); // Barra recta ~10kg
  const [calcResult, setCalcResult] = useState(null);

  // Toggle imagen (0 o 1)
  const [imgToggle, setImgToggle] = useState({});

  // Guardar sets completados
  useEffect(() => {
    try {
      localStorage.setItem('pandafit_completed_sets', JSON.stringify(completedSets));
    } catch (e) {
      console.error(e);
    }
  }, [completedSets]);

  // Sonido Beep con Web Audio API
  const playTimerBeep = () => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Temporizador Interval
  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      playTimerBeep();
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const startTimer = (secs) => {
    setTimerInitial(secs);
    setTimerSeconds(secs);
    setTimerActive(true);
  };

  const stopTimer = () => {
    setTimerActive(false);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(timerInitial);
  };

  // Alternar checkbox de set
  const toggleSet = (exerciseId, setIndex) => {
    const key = `${activeDay.id}_${exerciseId}_set_${setIndex}`;
    setCompletedSets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Alternar imagen paso 0 / paso 1
  const toggleExerciseImg = (exId) => {
    setImgToggle(prev => ({
      ...prev,
      [exId]: prev[exId] === 1 ? 0 : 1
    }));
  };

  // Calcular combinación óptima de discos por lado
  const calculatePlates = (target, bar) => {
    const neededOnPlates = Math.max(0, target - bar);
    const perSide = neededOnPlates / 2;

    // Discos disponibles en pares: 20kg, 10kg, 5kg, 1.5kg, 1kg
    const available = [20, 10, 5, 1.5, 1];
    let remaining = perSide;
    const platesUsed = [];

    for (const disc of available) {
      while (remaining >= disc - 0.01) {
        platesUsed.push(disc);
        remaining -= disc;
      }
    }

    setCalcResult({
      target,
      bar,
      perSide,
      platesUsed,
      remainder: remaining > 0.05 ? remaining.toFixed(1) : 0
    });
  };

  useEffect(() => {
    calculatePlates(calcTargetWeight, calcBarWeight);
  }, [calcTargetWeight, calcBarWeight]);

  return (
    <div className="fit-app-container">
      <Helmet>
        <title>Mi Rutina Privada de Entrenamiento | PandaFit</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Barra superior de control */}
      <div className="fit-topbar">
        <div className="fit-topbar-left">
          <Link to="/home" className="fit-back-link">
            ← Volver a PandaStore
          </Link>
          <span className="fit-private-badge">🔒 Acceso Privado VIP</span>
        </div>
        <div className="fit-user-pill">
          <span>Perfil: <strong>1.75m / ~85kg</strong></span>
          <span className="fit-separator">•</span>
          <span>Objetivo: <strong>Quema de Grasa & Hipertrofia (Recomposición)</strong></span>
        </div>
      </div>

      {/* Encabezado Principal */}
      <header className="fit-header">
        <div className="fit-badge-accent">PLAN DE ENTRENAMIENTO 7 DÍAS 100% ADAPTADO A TU EQUIPO</div>
        <h1 className="fit-main-title">Centro de Entrenamiento y Rutinas PandaFit</h1>
        <p className="fit-main-desc">
          Plan estructurado de <strong>Lunes a Domingo (60 a 90 min)</strong> diseñado para eliminar el rollo abdominal,
          marcar la V del abdomen, ensanchar el torso y ganar masa muscular magra utilizando exactamente tu equipo:
          <strong> Press banca plano, Multigimnasio Atletis, Barra Curva Z, Mancuernas, Discos (20/10/5/1.5/1kg), Banco Declinado, Torre Vertical y Bicicleta Estática</strong>.
        </p>

        {/* Resumen de Equipamiento Detectado */}
        <div className="fit-gear-summary">
          <div className="gear-tag">🏋️ Bench Press Plano + Rack</div>
          <div className="gear-tag">⚙️ Multigimnasio Atletis (Poleas/Mariposa)</div>
          <div className="gear-tag">⚡ Barra Curva EZ (Z-Bar)</div>
          <div className="gear-tag">🔩 Mancuernas Chicas & Grandes</div>
          <div className="gear-tag">🥞 Discos: 20kg, 10kg, 5kg, 1.5kg, 1kg</div>
          <div className="gear-tag">📐 Banco Declinado Abdomen</div>
          <div className="gear-tag">🏰 Torre Rodillas al Pecho</div>
          <div className="gear-tag">🚴 Bicicleta Estática (HIIT/Zona 2)</div>
          <div className="gear-tag">🧘 Colchoneta</div>
        </div>
      </header>

      {/* Widget Flotante del Temporizador de Descanso */}
      <div className={`fit-timer-floating ${timerActive ? 'active' : ''}`}>
        <div className="timer-header">
          <span className="timer-icon">⏱️</span>
          <span className="timer-label">Temporizador de Descanso</span>
          {timerActive && <span className="timer-live-dot"></span>}
        </div>
        <div className="timer-display">
          {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
        </div>
        <div className="timer-presets">
          {[30, 45, 60, 90, 120].map(s => (
            <button
              key={s}
              className={`preset-btn ${timerInitial === s && timerActive ? 'selected' : ''}`}
              onClick={() => startTimer(s)}
            >
              {s}s
            </button>
          ))}
        </div>
        <div className="timer-actions">
          {timerActive ? (
            <button className="timer-btn-stop" onClick={stopTimer}>Pausar</button>
          ) : (
            <button className="timer-btn-start" onClick={() => startTimer(timerSeconds || timerInitial)}>Reanudar</button>
          )}
          <button className="timer-btn-reset" onClick={resetTimer}>Reiniciar</button>
        </div>
      </div>

      {/* Selector de Días de la Semana */}
      <div className="fit-days-nav-wrapper">
        <div className="fit-days-nav">
          {DAYS_DATA.map((day) => {
            const isToday = day.dayIndex === todayIndex;
            const isSelected = day.id === activeDay.id;
            return (
              <button
                key={day.id}
                className={`day-tab-btn ${isSelected ? 'active' : ''} ${isToday ? 'today-highlight' : ''}`}
                onClick={() => setActiveDay(day)}
              >
                <div className="day-tab-top">
                  <span className="day-name">{day.shortName}</span>
                  {isToday && <span className="today-badge">HOY</span>}
                </div>
                <div className="day-tab-focus">{day.focus}</div>
                <div className="day-tab-indicator" style={{ backgroundColor: day.tagColor }}></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel del Día Seleccionado */}
      <main className="fit-main-content">
        <div className="day-overview-card" style={{ borderLeftColor: activeDay.tagColor }}>
          <div className="day-overview-left">
            <span className="day-badge-pill" style={{ backgroundColor: `${activeDay.tagColor}22`, color: activeDay.tagColor }}>
              {activeDay.shortName.toUpperCase()}
            </span>
            <h2 className="day-title">{activeDay.title}</h2>
            <p className="day-desc">{activeDay.description}</p>
          </div>
          <div className="day-meta-grid">
            <div className="meta-box">
              <span className="meta-label">Duración</span>
              <span className="meta-val">⏱️ {activeDay.duration}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Intensidad</span>
              <span className="meta-val">🔥 {activeDay.intensity}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Gasto Estimado</span>
              <span className="meta-val">⚡ {activeDay.calories}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Ejercicios</span>
              <span className="meta-val">📋 {activeDay.exercises.length}</span>
            </div>
          </div>
        </div>

        {/* Lista de Ejercicios del Día */}
        <section className="fit-exercises-grid">
          {activeDay.exercises.map((ex, idx) => {
            const currentImgStep = imgToggle[ex.id] || 0;
            const imgUrl = `${IMG_BASE}${ex.imgId}/${currentImgStep}.jpg`;

            return (
              <div key={ex.id} className="exercise-card">
                <div className="exercise-num-badge">#{idx + 1}</div>

                <div className="exercise-img-wrapper">
                  <img
                    src={imgUrl}
                    alt={ex.name}
                    className="exercise-img"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <button
                    className="btn-switch-img"
                    title="Alternar entre posición inicial y contracción"
                    onClick={() => toggleExerciseImg(ex.id)}
                  >
                    🔄 Ver {currentImgStep === 0 ? 'Contracción' : 'Inicio'}
                  </button>
                </div>

                <div className="exercise-body">
                  <div className="exercise-header">
                    <h3 className="exercise-title">{ex.name}</h3>
                    <div className="exercise-gear-badge">
                      <span>🛠️ {ex.equipment}</span>
                    </div>
                  </div>

                  <div className="exercise-muscle-tag">
                    🎯 <strong>Músculo:</strong> {ex.target}
                  </div>

                  <div className="exercise-parameters">
                    <div className="param-pill">
                      <span className="param-name">Series</span>
                      <span className="param-value">{ex.sets}</span>
                    </div>
                    <div className="param-pill">
                      <span className="param-name">Reps</span>
                      <span className="param-value">{ex.reps}</span>
                    </div>
                    <div className="param-pill">
                      <span className="param-name">Descanso</span>
                      <span className="param-value">{ex.rest}s</span>
                    </div>
                    <button
                      className="btn-quick-rest"
                      onClick={() => startTimer(ex.rest)}
                      title="Activar temporizador con este descanso"
                    >
                      ⏱️ Descansar ({ex.rest}s)
                    </button>
                  </div>

                  {/* Checklist de Series completadas */}
                  <div className="exercise-sets-tracker">
                    <span className="tracker-label">Marcar Series Realizadas:</span>
                    <div className="sets-boxes">
                      {Array.from({ length: ex.sets }).map((_, sIdx) => {
                        const setKey = `${activeDay.id}_${ex.id}_set_${sIdx}`;
                        const isDone = !!completedSets[setKey];
                        return (
                          <button
                            key={sIdx}
                            className={`set-check-btn ${isDone ? 'done' : ''}`}
                            onClick={() => toggleSet(ex.id, sIdx)}
                          >
                            {isDone ? '✓' : `S${sIdx + 1}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="exercise-tip-box">
                    <span className="tip-icon">💡</span>
                    <span className="tip-text"><strong>Técnica Clave:</strong> {ex.tip}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Herramientas de Apoyo: Calculadora de Discos & Reglas de Oro */}
        <section className="fit-tools-section">
          {/* Calculadora de Discos */}
          <div className="fit-calc-card">
            <div className="calc-header">
              <h3>🥞 Calculadora de Discos por Lado</h3>
              <p>Indica el peso total que deseas levantar y te diremos exactamente qué discos colocar usando tus discos de 20kg, 10kg, 5kg, 1.5kg y 1kg.</p>
            </div>
            <div className="calc-inputs">
              <div className="calc-group">
                <label>Peso Objetivo Total (kg):</label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  step="1"
                  value={calcTargetWeight}
                  onChange={(e) => setCalcTargetWeight(Number(e.target.value))}
                />
              </div>
              <div className="calc-group">
                <label>Tipo de Barra:</label>
                <select
                  value={calcBarWeight}
                  onChange={(e) => setCalcBarWeight(Number(e.target.value))}
                >
                  <option value={10}>Barra Recta Olímpica / Banco (10 kg)</option>
                  <option value={6}>Barra Curva EZ (6 kg)</option>
                  <option value={2}>Mancuerna individual con seguro (2 kg)</option>
                  <option value={0}>Sin barra (Solo peso de discos)</option>
                </select>
              </div>
            </div>

            {calcResult && (
              <div className="calc-result-box">
                <div className="calc-result-stat">
                  <span>Peso en cada lado:</span>
                  <strong>{calcResult.perSide} kg</strong>
                </div>
                <div className="calc-plates-diagram">
                  <span className="bar-label">BARRA</span>
                  {calcResult.platesUsed.length > 0 ? (
                    calcResult.platesUsed.map((plate, pIdx) => (
                      <span key={pIdx} className={`plate-badge plate-${plate.toString().replace('.', '_')}`}>
                        {plate} kg
                      </span>
                    ))
                  ) : (
                    <span className="no-plates">Sin discos (solo la barra)</span>
                  )}
                </div>
                {calcResult.remainder > 0 && (
                  <p className="calc-note">
                    ⚠️ Queda una diferencia de {calcResult.remainder} kg por lado (ajusta al disco más cercano).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Guía Nutricional para Pérdida de Grasa y Recomposición (1.75m / ~85kg) */}
          <div className="fit-nutrition-card">
            <h3>🥩 Guía de Nutrición & V-Taper (1.75m / ~85kg)</h3>
            <p className="nutri-intro">
              Para bajar el rollo de la guata y al mismo tiempo ganar músculo sin quedar flácido (Recomposición Corporal):
            </p>
            <ul className="nutri-list">
              <li>
                <strong>🔥 Déficit Calórico Moderado (~2,000 - 2,150 kcal):</strong> No hagas dietas extremas de pasar hambre. Un déficit de 400 kcal diarias te hará perder de 2 a 3 kg de pura grasa al mes mientras tu masa muscular sube.
              </li>
              <li>
                <strong>🍗 Alta Proteína (160g a 170g al día):</strong> Huevos enteros, pechuga de pollo, atún, carnes magras o batido de proteína. La proteína mantiene tu músculo intacto mientras quemas la grasa acumulada.
              </li>
              <li>
                <strong>💧 3 a 3.5 Litros de Agua Diarios:</strong> Retener líquidos hace que la panza se vea inflamada. Tomar suficiente agua elimina la retención y acelera la lipólisis.
              </li>
              <li>
                <strong>🚫 Cero Calorías Líquidas:</strong> Elimina gaseosas con azúcar, jugos procesados y reduce el alcohol. Solo agua, café solo o té verde.
              </li>
              <li>
                <strong>🌙 7 a 8 Horas de Sueño:</strong> Dormir poco eleva el cortisol, la hormona que hace que el cuerpo almacene grasa específicamente en la zona abdominal y destruya el tejido muscular.
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Pie de página Fitness */}
      <footer className="fit-footer">
        <p>PandaFit Private System • Tu rutina personal para transformar tu físico con consistencia diaria.</p>
        <Link to="/home" className="fit-return-btn">Volver a la Tienda PandaStore</Link>
      </footer>
    </div>
  );
}

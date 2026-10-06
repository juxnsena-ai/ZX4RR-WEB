/* =========================================================
   DATOS: sistemas, piezas, ficha técnica, rivales, colores
   Todo el contenido de texto de la página vive aquí.
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});

  // ---------- Sistemas del despiece ----------
  ZX.SYSTEMS = {
    motor:       { name: 'Motor',                  color: '#6BCB1F', icon: 'fa-gear' },
    admision:    { name: 'Admisión, escape y frío', color: '#ff8a2a', icon: 'fa-wind' },
    chasis:      { name: 'Chasis',                 color: '#3fa9ff', icon: 'fa-draw-polygon' },
    suspension:  { name: 'Suspensión',             color: '#ffd23f', icon: 'fa-arrows-up-down' },
    frenos:      { name: 'Ruedas, frenos y cadena', color: '#ff4d6d', icon: 'fa-circle-dot' },
    carroceria:  { name: 'Carrocería',             color: '#b48cff', icon: 'fa-shield-halved' },
    electronica: { name: 'Electrónica y mandos',   color: '#2de0c8', icon: 'fa-microchip' }
  };

  // ---------- Información de cada pieza ----------
  // n = nombre, d = descripción, s = especificaciones [etiqueta, valor], t = dato técnico
  const I = {};

  I.carter = { n: 'Cárter del motor', d: 'Bloque inferior que aloja el cigüeñal y la caja de cambios de 6 velocidades. Su diseño compacto permite meter un tetracilíndrico en un chasis de tamaño 400.', s: [['Configuración', '4 cilindros en línea'], ['Cilindrada', '399 cm³'], ['Lubricación', 'Forzada, cárter húmedo']], t: 'Con solo 399 cm³ repartidos en 4 cilindros, cada uno cubica unos 100 cm³: piezas pequeñas y ligeras que permiten girar altísimo.' };
  I.carterAceite = { n: 'Cárter de aceite', d: 'Depósito inferior del aceite. Desde aquí la bomba lo aspira y lo envía a presión a cojinetes, levas y caja de cambios.', s: [['Función', 'Reserva de lubricante'], ['Sistema', 'Cárter húmedo']], t: 'Un aceite en buen estado es vital en un motor que supera las 15.000 rpm.' };
  I.bloque = { n: 'Bloque de cilindros', d: 'Contiene las cuatro camisas por las que se desplazan los pistones. Arquitectura súper cuadrada: el diámetro es mucho mayor que la carrera.', s: [['Diámetro × carrera', '57,0 × 39,1 mm'], ['Relación de compresión', '12,3 : 1'], ['Refrigeración', 'Líquida']], t: 'Una carrera tan corta reduce el recorrido del pistón en cada vuelta y permite regímenes muy altos.' };
  I.culata = { n: 'Culata DOHC', d: 'Aloja los dos árboles de levas, las 16 válvulas y las cámaras de combustión. Sus conductos están pensados para respirar a alto régimen.', s: [['Distribución', 'DOHC (doble árbol de levas)'], ['Válvulas', '16 · 4 por cilindro']], t: 'DOHC significa doble árbol de levas en cabeza: uno acciona la admisión y el otro el escape.' };
  I.tapaValvulas = { n: 'Tapa de válvulas', d: 'Cubierta superior de la culata. Sella el compartimento de la distribución y protege levas y válvulas.', s: [['Función', 'Sellado de la distribución']], t: 'Bajo esta tapa está la mecánica que da al motor su característico aullido.' };
  I.levaAdm = { n: 'Árbol de levas de admisión', d: 'Abre las 8 válvulas de admisión en el momento exacto. Su perfil decide cuánta mezcla aire-gasolina entra en cada cilindro.', s: [['Válvulas que acciona', '8 de admisión'], ['Gira a', 'La mitad de vueltas que el cigüeñal']], t: 'En un motor de 4 tiempos las levas giran a la mitad de velocidad del cigüeñal.' };
  I.levaEsc = { n: 'Árbol de levas de escape', d: 'Abre las 8 válvulas de escape para expulsar los gases quemados hacia los colectores.', s: [['Válvulas que acciona', '8 de escape'], ['Gira a', 'La mitad de vueltas que el cigüeñal']], t: 'A 15.000 rpm del motor, cada leva gira a 7.500 rpm.' };
  I.valvulas = { n: 'Válvulas (16)', d: 'Cuatro válvulas por cilindro: dos de admisión y dos de escape. Más superficie de paso permite llenar y vaciar el cilindro muy rápido.', s: [['Total', '16 válvulas'], ['Por cilindro', '2 admisión + 2 escape']], t: 'Varias válvulas pequeñas son más ligeras que una grande y cierran a tiempo a altas rpm.' };
  [1, 2, 3, 4].forEach(function (k) {
    I['piston' + k] = { n: 'Pistón n.º ' + k, d: 'Pistón de aleación ligera de 57 mm. Recibe la fuerza de la combustión y la transmite a la biela.', s: [['Diámetro', '57,0 mm'], ['Carrera', '39,1 mm'], ['Cilindro', k + ' de 4']], t: 'A 15.000 rpm cada pistón sube y baja 250 veces por segundo.' };
    I['biela' + k] = { n: 'Biela n.º ' + k, d: 'Une el pistón con el cigüeñal y convierte el movimiento lineal en giro. Soporta enormes cargas de tracción y compresión.', s: [['Extremo superior', 'Bulón del pistón'], ['Extremo inferior', 'Muñequilla del cigüeñal']], t: 'Los pistones 1 y 4 suben juntos, igual que el 2 y el 3: cigüeñal a 180°.' };
  });
  I.ciguenal = { n: 'Cigüeñal', d: 'Eje que transforma el movimiento alternativo de los cuatro pistones en giro. Sus contrapesos equilibran las fuerzas para un funcionamiento suave.', s: [['Disposición', 'Muñequillas a 180°'], ['Par máximo', '39,0 N·m a 13.000 rpm']], t: 'En la animación puedes ver cómo 1-4 y 2-3 se mueven en parejas opuestas.' };
  I.ejePrimario = { n: 'Eje primario (caja)', d: 'Recibe el giro del motor a través del embrague y lo reparte a los engranajes de las seis velocidades.', s: [['Velocidades', '6'], ['Cambio', 'Con quickshifter KQS']], t: 'El KQS bidireccional permite subir y bajar marchas sin tocar el embrague.' };
  I.ejeSecundario = { n: 'Eje secundario (caja)', d: 'Recibe el par del engranaje seleccionado y lo envía al piñón de ataque de la cadena.', s: [['Salida', 'Piñón de ataque'], ['Transmisión final', 'Cadena']], t: 'Cada marcha es una pareja de engranajes con distinto tamaño: ahí está la desmultiplicación.' };
  I.embrague = { n: 'Embrague asistido y antirrebote', d: 'Embrague multidisco en baño de aceite. La función asistida suaviza la maneta y el antirrebote evita que la rueda trasera se bloquee al reducir fuerte.', s: [['Tipo', 'Multidisco en baño de aceite'], ['Función', 'Asistido + antirrebote']], t: 'El antirrebote es clave en frenadas fuertes de circuito.' };
  I.tapaEmbrague = { n: 'Tapa del embrague', d: 'Tapa lateral derecha del motor que protege el conjunto del embrague.', s: [['Lado', 'Derecho']], t: 'En el despiece verás debajo los discos del embrague apilados.' };
  I.alternador = { n: 'Alternador', d: 'Genera la electricidad que carga la batería y alimenta inyección, encendido, luces LED y la pantalla TFT.', s: [['Ubicación', 'Extremo izquierdo del cigüeñal']], t: 'Gira solidario con el cigüeñal: cuantas más rpm, más corriente produce.' };
  I.tapaAlternador = { n: 'Tapa del alternador', d: 'Tapa lateral izquierda que protege el rotor y el estator del alternador.', s: [['Lado', 'Izquierdo']], t: 'Es una de las piezas más expuestas en una caída: por eso existen las tapas protectoras.' };
  I.arranque = { n: 'Motor de arranque', d: 'Motor eléctrico que hace girar el cigüeñal para poner en marcha la moto al pulsar el botón de arranque.', s: [['Arranque', 'Eléctrico']], t: 'Pruébalo en la sección Cockpit con el botón ENGINE START.' };
  I.filtroAceite = { n: 'Filtro de aceite', d: 'Retiene las impurezas del aceite antes de que llegue a las piezas en movimiento.', s: [['Mantenimiento', 'Cambio periódico con el aceite']], t: 'Un filtro limpio protege los cojinetes de un motor que gira muy alto.' };
  I.bobinas = { n: 'Bobinas y bujías', d: 'Una bobina tipo lápiz por cilindro genera la chispa de alta tensión en cada bujía, gestionada digitalmente por la ECU.', s: [['Encendido', 'Digital'], ['Cantidad', '4 bobinas · 4 bujías']], t: 'A 15.000 rpm cada bujía salta 125 veces por segundo.' };

  I.ramAir = { n: 'Toma Ram Air', d: 'Conducto central que capta aire a presión desde el frontal y lo lleva a la caja de aire. A alta velocidad aumenta la potencia.', s: [['Potencia', '57,0 kW (77 PS) a 14.500 rpm'], ['Con Ram Air', '59,0 kW (80 PS) a 14.500 rpm']], t: 'Cuanto más rápido vas, más aire empuja hacia el motor: es un pequeño "turbo" natural.' };
  I.cajaAire = { n: 'Caja de aire', d: 'Cámara que recibe el aire de la toma Ram Air, lo filtra y lo reparte de forma estable a los cuatro cuerpos de aceleración.', s: [['Alimentación', 'Toma Ram Air frontal'], ['Incluye', 'Filtro de aire']], t: 'Su volumen está calculado para que el motor respire bien a muy alto régimen.' };
  I.cuerposAcel = { n: 'Cuerpos de aceleración', d: 'Cuatro cuerpos de aceleración con inyección electrónica, uno por cilindro. El acelerador electrónico permite los modos de potencia y el control de tracción.', s: [['Alimentación', 'Inyección electrónica'], ['Mando', 'Acelerador electrónico']], t: 'Al ser electrónico, la ECU puede suavizar la respuesta en modo Rain.' };
  I.colectores = { n: 'Colectores de escape', d: 'Cuatro tubos, uno por cilindro, que recogen los gases y los unen bajo el motor hacia la precámara.', s: [['Cantidad', '4 tubos'], ['Recorrido', 'Bajo el motor']], t: 'Su longitud y diámetro se ajustan para favorecer el llenado a altas rpm.' };
  I.precamara = { n: 'Precámara y catalizador', d: 'Situada bajo el motor, aloja el catalizador y aporta volumen al escape para mejorar el par y cumplir la normativa de emisiones.', s: [['Ubicación', 'Bajo el motor'], ['Función', 'Catalizador + volumen']], t: 'Colocarla abajo baja el centro de gravedad de la moto.' };
  I.silenciador = { n: 'Silenciador', d: 'Silenciador corto lateral que concentra el peso cerca del centro de la moto. En el configurador puedes cambiarlo por variantes de titanio o carbono.', s: [['Lado', 'Derecho'], ['Formato', 'Corto, bajo y lateral']], t: 'Un silenciador corto mejora la centralización de masas.' };
  I.radiador = { n: 'Radiador', d: 'Disipa el calor del líquido refrigerante. Su tamaño está pensado para mantener la temperatura estable en uso deportivo.', s: [['Refrigeración', 'Líquida'], ['Ubicación', 'Delante del motor']], t: 'Mantener la temperatura estable es clave para que el motor rinda igual en la primera y en la última vuelta.' };
  I.ventilador = { n: 'Electroventilador', d: 'Ventilador detrás del radiador que se activa cuando la moto está parada o en tráfico y la temperatura sube.', s: [['Activación', 'Automática por temperatura']], t: 'A velocidad el aire pasa solo por el radiador; el ventilador trabaja sobre todo en ciudad.' };

  I.chasis = { n: 'Chasis multitubular trellis', d: 'Estructura de tubos de acero de alta resistencia. Su rigidez está calibrada para dar precisión en curva y estabilidad en frenadas fuertes.', s: [['Tipo', 'Trellis de acero de alta resistencia'], ['Lanzamiento / avance', '23,5° / 97 mm'], ['Distancia entre ejes', '1.380 mm']], t: 'El motor y el chasis trabajan juntos para conseguir la rigidez deseada.' };
  I.subchasis = { n: 'Subchasis', d: 'Estructura trasera que soporta los asientos, el colín, la batería y la electrónica.', s: [['Soporta', 'Asientos, colín y electrónica']], t: 'Al ser una pieza aparte, se puede reparar sin tocar el chasis principal.' };
  I.basculante = { n: 'Basculante', d: 'Brazo oscilante que une la rueda trasera con el chasis y trabaja junto al amortiguador.', s: [['Suspensión', 'Horizontal Back-link'], ['Transmisión', 'Cadena en el lado izquierdo']], t: 'Su longitud influye en la tracción a la salida de las curvas.' };
  I.deposito = { n: 'Depósito de combustible', d: 'Depósito con hendiduras laterales para apoyar las rodillas al colgarse en las curvas.', s: [['Capacidad', '15 litros']], t: 'Sujetarse con las rodillas libera los brazos para dirigir la moto con precisión.' };
  I.asientoPiloto = { n: 'Asiento del piloto', d: 'Asiento deportivo que permite moverse con libertad entre curvas.', s: [['Altura del asiento', '800 mm']], t: 'Una altura de 800 mm es accesible para una supersport.' };
  I.asientoPasajero = { n: 'Asiento del pasajero', d: 'Asiento trasero desmontable. En el configurador puedes cambiarlo por un colín monoplaza.', s: [['Opción', 'Colín monoplaza']], t: 'Con el colín monoplaza la moto toma un aspecto de pura competición.' };
  I.estriberasPiloto = { n: 'Estriberas del piloto', d: 'Estriberas con el pedal de freno trasero (derecha) y la palanca de cambio (izquierda).', s: [['Incluye', 'Pedal de freno y palanca de cambio']], t: 'La palanca de cambio va unida al sensor del quickshifter KQS.' };
  I.estriberasPasajero = { n: 'Estriberas del pasajero', d: 'Estriberas traseras atornilladas al subchasis.', s: [['Montaje', 'Subchasis']], t: 'En circuito suelen desmontarse para ahorrar peso.' };
  I.caballete = { n: 'Caballete lateral', d: 'Soporte lateral para estacionar la moto, en el lado izquierdo.', s: [['Lado', 'Izquierdo']], t: 'Tiene un sensor de seguridad que impide circular con él desplegado.' };

  I.horquillaIzq = { n: 'Barra de horquilla izquierda', d: 'Horquilla invertida Showa SFF-BP de 37 mm: diseño de funciones separadas con pistón grande, para una amortiguación progresiva y precisa.', s: [['Tipo', 'Invertida Showa SFF-BP'], ['Diámetro', '37 mm'], ['Ajuste', 'Precarga (ZX-4RR)']], t: 'SFF-BP significa Separate Function Fork – Big Piston.' };
  I.horquillaDer = { n: 'Barra de horquilla derecha', d: 'Segunda barra de la horquilla Showa SFF-BP de 37 mm. Trabaja en pareja con la izquierda.', s: [['Tipo', 'Invertida Showa SFF-BP'], ['Diámetro', '37 mm'], ['Ajuste', 'Precarga (ZX-4RR)']], t: 'Las barras invertidas tienen la parte gruesa arriba: más rigidez y menos peso no suspendido.' };
  I.tijaSup = { n: 'Tija superior', d: 'Une la parte alta de las barras de la horquilla con la pipa de dirección.', s: [['Función', 'Rigidez y alineación del tren delantero']], t: 'Los semimanillares van anclados justo debajo de esta tija.' };
  I.tijaInf = { n: 'Tija inferior', d: 'Une la parte baja de las barras con el eje de dirección, que gira dentro de la pipa del chasis.', s: [['Geometría', 'Lanzamiento 23,5° · avance 97 mm']], t: 'La geometría de la dirección define la agilidad de la moto.' };
  I.amortiguador = { n: 'Amortiguador Showa BFRC lite', d: 'Monoamortiguador con cámara de gas separada, de origen racing. Totalmente ajustable en la ZX-4RR: precarga, compresión y extensión.', s: [['Tipo', 'Showa BFRC lite'], ['Ajustes', 'Precarga, compresión y extensión']], t: 'BFRC significa Balance Free Rear Cushion.' };
  I.bieletas = { n: 'Bieletas Horizontal Back-link', d: 'Sistema de bieletas que coloca el amortiguador casi horizontal sobre el basculante: centraliza masas y aleja el amortiguador del calor del escape.', s: [['Sistema', 'Horizontal Back-link']], t: 'Es una tecnología que Kawasaki también usa en sus superdeportivas grandes.' };

  I.llantaDel = { n: 'Llanta delantera', d: 'Llanta de aleación de 17 pulgadas con radios de diseño deportivo.', s: [['Medida', '17"'], ['Neumático', '120/70ZR17']], t: 'Las llantas ligeras reducen el efecto giroscópico y facilitan los cambios de dirección.' };
  I.neumaticoDel = { n: 'Neumático delantero', d: 'Neumático radial deportivo que da agarre y confianza en frenada y en apoyo.', s: [['Medida', '120/70ZR17']], t: 'La "ZR" indica que es apto para velocidades superiores a 240 km/h.' };
  I.llantaTras = { n: 'Llanta trasera', d: 'Llanta de aleación de 17 pulgadas con la corona y el disco trasero.', s: [['Medida', '17"'], ['Neumático', '160/60ZR17']], t: 'Es más ancha que la delantera para transmitir la potencia al suelo.' };
  I.neumaticoTras = { n: 'Neumático trasero', d: 'Neumático radial deportivo de perfil 160/60 para tracción y estabilidad.', s: [['Medida', '160/60ZR17']], t: 'En la sección Cockpit puedes ver cuándo el control KTRC evita que patine.' };
  I.discoIzq = { n: 'Disco delantero izquierdo', d: 'Disco semiflotante lobulado (petal) de 290 mm. Disipa bien el calor y reduce peso.', s: [['Diámetro', '290 mm'], ['Tipo', 'Semiflotante lobulado']], t: 'El diseño lobulado ayuda a evacuar calor y suciedad de las pastillas.' };
  I.discoDer = { n: 'Disco delantero derecho', d: 'Segundo disco semiflotante lobulado de 290 mm del sistema de doble disco.', s: [['Diámetro', '290 mm'], ['Tipo', 'Semiflotante lobulado']], t: 'Semiflotante: la pista de frenado se dilata con el calor sin deformarse.' };
  I.pinzaIzq = { n: 'Pinza delantera izquierda', d: 'Pinza monobloque de anclaje radial con 4 pistones opuestos.', s: [['Montaje', 'Radial'], ['Pistones', '4 opuestos · monobloque']], t: 'El anclaje radial da más rigidez y un tacto de maneta más preciso.' };
  I.pinzaDer = { n: 'Pinza delantera derecha', d: 'Pinza monobloque de anclaje radial con 4 pistones opuestos.', s: [['Montaje', 'Radial'], ['Pistones', '4 opuestos · monobloque']], t: 'Monobloque: el cuerpo de la pinza está hecho de una sola pieza.' };
  I.discoTras = { n: 'Disco trasero', d: 'Disco lobulado de 220 mm para la rueda trasera.', s: [['Diámetro', '220 mm']], t: 'El freno trasero ayuda a estabilizar la moto al entrar en curva.' };
  I.pinzaTras = { n: 'Pinza trasera', d: 'Pinza de un pistón para el disco trasero, con ABS.', s: [['Pistones', '1'], ['ABS', 'Sí']], t: 'El ABS evita que la rueda se bloquee en frenadas de emergencia.' };
  I.cadena = { n: 'Cadena de transmisión', d: 'Transmite el par del piñón de salida a la corona trasera.', s: [['Transmisión final', 'Cadena'], ['Lado', 'Izquierdo']], t: 'Su tensión y engrase influyen en la suavidad y la duración.' };
  I.pinon = { n: 'Piñón de ataque', d: 'Engranaje pequeño a la salida de la caja de cambios que mueve la cadena.', s: [['Ubicación', 'Eje secundario']], t: 'Cambiar su número de dientes modifica la aceleración y la velocidad punta.' };
  I.corona = { n: 'Corona', d: 'Engranaje grande de la rueda trasera, movido por la cadena.', s: [['Ubicación', 'Buje trasero']], t: 'Una corona más grande da más aceleración a cambio de menos velocidad punta.' };

  I.carenadoFrontal = { n: 'Carenado frontal', d: 'Frontal de la familia Ninja ZX con la toma Ram Air entre los dos faros LED.', s: [['Incluye', 'Toma Ram Air central'], ['Iluminación', 'Full LED']], t: 'Su forma canaliza el aire hacia la toma central.' };
  I.cupula = { n: 'Cúpula', d: 'Pantalla aerodinámica que desvía el aire sobre el piloto agachado. El configurador incluye una opción ahumada más alta.', s: [['Función', 'Protección aerodinámica']], t: 'Agachado tras la cúpula, el piloto reduce mucho la resistencia al aire.' };
  I.lateralIzq = { n: 'Carenado lateral izquierdo', d: 'Panel lateral con la decoración de la moto y salidas de aire caliente del radiador.', s: [['Decoración', 'Según el color del configurador']], t: 'Las rejillas sacan el aire caliente lejos de las piernas del piloto.' };
  I.lateralDer = { n: 'Carenado lateral derecho', d: 'Panel lateral derecho con la decoración y las salidas de aire.', s: [['Decoración', 'Según el color del configurador']], t: 'Prueba a arrastrarlo para ver el motor que esconde.' };
  I.quilla = { n: 'Quilla', d: 'Carenado inferior que protege los colectores y canaliza el aire bajo el motor.', s: [['Ubicación', 'Bajo el motor']], t: 'Bajo ella están los colectores de escape.' };
  I.guardabarrosDel = { n: 'Guardabarros delantero', d: 'Protege de proyecciones de agua y piedras y mejora el flujo de aire alrededor de la rueda.', s: [['Montaje', 'Barras de la horquilla']], t: 'Se mueve junto con la suspensión delantera.' };
  I.colin = { n: 'Colín', d: 'Parte trasera afilada de la carrocería, inspirada en las ZX de competición.', s: [['Incluye', 'Piloto trasero LED']], t: 'Su forma afilada reduce la turbulencia detrás del piloto.' };
  I.portamatricula = { n: 'Portamatrículas', d: 'Soporte de la matrícula con los intermitentes traseros.', s: [['Incluye', 'Intermitentes traseros']], t: 'En circuito se desmonta junto con los retrovisores.' };
  I.retrovisores = { n: 'Retrovisores', d: 'Retrovisores montados en el carenado, fuera del alcance de los brazos al agacharse.', s: [['Montaje', 'Carenado frontal']], t: 'Montarlos en el carenado deja libres los semimanillares.' };

  I.faros = { n: 'Faros LED dobles', d: 'Iluminación full LED con dos faros delanteros de alta eficiencia.', s: [['Tipo', 'LED'], ['Unidades', '2']], t: 'Los LED consumen menos y se encienden al instante.' };
  I.pilotoTrasero = { n: 'Piloto trasero LED', d: 'Luz trasera y de freno LED integrada en el colín.', s: [['Tipo', 'LED']], t: 'Se ilumina más fuerte al frenar.' };
  I.tft = { n: 'Pantalla TFT 4,3"', d: 'Pantalla a color con modos de conducción, control de tracción, indicador de marcha y conexión Bluetooth con el móvil.', s: [['Tamaño', '4,3 pulgadas a color'], ['Conectividad', 'Bluetooth · app RIDEOLOGY']], t: 'Pruébala en la sección Cockpit.' };
  I.ecu = { n: 'ECU (centralita)', d: 'Cerebro electrónico: gestiona inyección, encendido, modos de potencia, KTRC y quickshifter.', s: [['Gestiona', 'Inyección, encendido, KTRC, KQS']], t: 'Decide en milisegundos cuánta potencia entregar según el modo elegido.' };
  I.bateria = { n: 'Batería', d: 'Alimenta el arranque y la electrónica cuando el motor está parado.', s: [['Ubicación', 'Bajo el asiento']], t: 'El alternador la recarga mientras el motor gira.' };
  I.abs = { n: 'Unidad ABS', d: 'Módulo hidráulico que regula la presión de frenado para evitar el bloqueo de las ruedas.', s: [['Canales', 'Delantero y trasero']], t: 'Compara la velocidad de ambas ruedas cientos de veces por segundo.' };
  I.kqs = { n: 'Sensor KQS (quickshifter)', d: 'Detecta el movimiento de la palanca de cambio para subir y bajar marchas sin embrague y sin cerrar gas.', s: [['Funcionamiento', 'Bidireccional'], ['De serie en', 'ZX-4RR']], t: 'Al subir corta la inyección unos milisegundos; al bajar da un golpe de gas automático.' };
  I.manillarIzq = { n: 'Semimanillar izquierdo', d: 'Semimanillar con la maneta de embrague y la piña de mandos (luces, intermitentes y menú de la TFT).', s: [['Incluye', 'Maneta de embrague y mandos']], t: 'Desde aquí se navega por los modos de la pantalla.' };
  I.manillarDer = { n: 'Semimanillar derecho', d: 'Semimanillar con el puño del acelerador electrónico, la maneta y la bomba del freno delantero.', s: [['Incluye', 'Acelerador y freno delantero']], t: 'La bomba de freno lleva su propio depósito de líquido.' };

  ZX.PART_INFO = I;

  // ---------- Ficha técnica ----------
  ZX.SPECS = [
    { id: 'motor', name: 'Motor y transmisión', icon: 'fa-gauge-high', rows: [
      ['Tipo de motor', '4 tiempos, 4 cilindros en línea, DOHC, 16 válvulas, refrigeración líquida'],
      ['Cilindrada', '399 cm³', true],
      ['Diámetro × carrera', '57,0 × 39,1 mm'],
      ['Relación de compresión', '12,3 : 1'],
      ['Potencia máxima', '57,0 kW (77 PS) a 14.500 rpm'],
      ['Potencia con Ram Air', '59,0 kW (80 PS) a 14.500 rpm', true],
      ['Par máximo', '39,0 N·m a 13.000 rpm'],
      ['Transmisión', '6 velocidades · embrague asistido y antirrebote'],
      ['Quickshifter', 'KQS bidireccional (de serie en la ZX-4RR)'],
      ['Transmisión final', 'Cadena']
    ]},
    { id: 'chasis', name: 'Chasis y suspensiones', icon: 'fa-draw-polygon', rows: [
      ['Chasis', 'Multitubular trellis de acero de alta resistencia'],
      ['Suspensión delantera', 'Horquilla invertida Showa SFF-BP de 37 mm, ajuste de precarga'],
      ['Suspensión trasera', 'Horizontal Back-link, Showa BFRC lite totalmente ajustable', true],
      ['Lanzamiento / avance', '23,5° / 97 mm'],
      ['Neumático delantero', '120/70ZR17'],
      ['Neumático trasero', '160/60ZR17']
    ]},
    { id: 'electronica', name: 'Electrónica y frenos', icon: 'fa-microchip', rows: [
      ['Freno delantero', 'Doble disco semiflotante lobulado de 290 mm, pinzas radiales monobloque de 4 pistones'],
      ['Freno trasero', 'Disco lobulado de 220 mm, pinza de 1 pistón'],
      ['ABS', 'De serie'],
      ['Control de tracción', 'KTRC con 3 niveles + OFF', true],
      ['Modos de potencia', 'Full / Low'],
      ['Modos de conducción', 'Sport, Road, Rain y Rider (personalizable)'],
      ['Instrumentación', 'TFT a color de 4,3" con conectividad Bluetooth (RIDEOLOGY)'],
      ['Iluminación', 'Full LED']
    ]},
    { id: 'dimensiones', name: 'Dimensiones y peso', icon: 'fa-ruler-combined', rows: [
      ['Largo × ancho × alto', '1.990 × 765 × 1.110 mm'],
      ['Distancia entre ejes', '1.380 mm'],
      ['Distancia libre al suelo', '135 mm'],
      ['Altura del asiento', '800 mm'],
      ['Depósito de combustible', '15 litros'],
      ['Peso en orden de marcha', '189 kg', true]
    ]}
  ];

  // ---------- Rivales para la comparativa ----------
  // Cifras aproximadas declaradas por los fabricantes (pueden variar por año y mercado).
  ZX.BIKES = [
    { id: 'zx4rr', name: 'Kawasaki Ninja ZX-4RR', short: 'ZX-4RR', cc: 399, cyl: 4, hp: 77, hpRam: 80, nm: 39, kg: 189, rpm: 14500, color: '#6BCB1F', main: true },
    { id: 'r3',    name: 'Yamaha YZF-R3',         short: 'YZF-R3',  cc: 321, cyl: 2, hp: 42, nm: 29.6, kg: 169, rpm: 10750, color: '#3d8bff' },
    { id: 'cbr500', name: 'Honda CBR500R',        short: 'CBR500R', cc: 471, cyl: 2, hp: 47, nm: 43, kg: 192, rpm: 8600, color: '#ff4d4d' },
    { id: 'rs457', name: 'Aprilia RS 457',        short: 'RS 457',  cc: 457, cyl: 2, hp: 47.6, nm: 43.5, kg: 175, rpm: 9400, color: '#c06cff' },
    { id: 'r7',    name: 'Yamaha YZF-R7',         short: 'YZF-R7',  cc: 689, cyl: 2, hp: 73, nm: 67, kg: 188, rpm: 8750, color: '#2de0c8' },
    { id: 'cbr650', name: 'Honda CBR650R',        short: 'CBR650R', cc: 649, cyl: 4, hp: 94, nm: 63, kg: 209, rpm: 12000, color: '#ffb22e' },
    { id: 'zx6r',  name: 'Kawasaki Ninja ZX-6R',  short: 'ZX-6R',   cc: 636, cyl: 4, hp: 124, nm: 69, kg: 198, rpm: 13000, color: '#ff7ac8' }
  ];

  // ---------- Configurador ----------
  ZX.PAINT_PRESETS = [
    { id: 'krt',    name: 'KRT Edition',       p1: '#5fbf1e', p2: '#111214', p3: '#f2f4f5' },
    { id: 'lime',   name: 'Verde Lima Total',  p1: '#6BCB1F', p2: '#3a7d0c', p3: '#111214' },
    { id: 'ebony',  name: 'Negro Ébano',       p1: '#16181b', p2: '#0a0a0b', p3: '#6BCB1F' },
    { id: 'pearl',  name: 'Blanco Perla',      p1: '#e8eaed', p2: '#1b1e22', p3: '#6BCB1F' },
    { id: 'graph',  name: 'Gris Grafito',      p1: '#3b4047', p2: '#121417', p3: '#ff5a1f' },
    { id: 'blue',   name: 'Azul Racing',       p1: '#1550b0', p2: '#0b0c10', p3: '#ffffff' }
  ];
  ZX.FRAME_COLORS = [
    { id: 'green', name: 'Verde', hex: '#5fbf1e' },
    { id: 'black', name: 'Negro', hex: '#141516' },
    { id: 'silver', name: 'Plata', hex: '#a7adb4' },
    { id: 'red', name: 'Rojo', hex: '#c8231b' }
  ];
  ZX.WHEEL_COLORS = [
    { id: 'black', name: 'Negro', hex: '#121314' },
    { id: 'green', name: 'Verde', hex: '#5fbf1e' },
    { id: 'gold', name: 'Dorado', hex: '#c9a13a' },
    { id: 'silver', name: 'Plata', hex: '#b9bec4' }
  ];
  // precios ilustrativos en USD (solo como referencia)
  ZX.EXHAUSTS = [
    { id: 'stock',  name: 'Original',                 price: 0,   desc: 'Silenciador corto de serie' },
    { id: 'ti',     name: 'Slip-on de titanio',       price: 650, desc: 'Más ligero, acabado azulado' },
    { id: 'carbon', name: 'Slip-on racing de carbono', price: 820, desc: 'Corto y ovalado, estilo competición' }
  ];
  ZX.ACCESSORIES = [
    { id: 'screen',  name: 'Cúpula ahumada racing',   price: 120, icon: 'fa-wind' },
    { id: 'cowl',    name: 'Colín monoplaza',         price: 180, icon: 'fa-chair' },
    { id: 'sliders', name: 'Topes anticaída',         price: 140, icon: 'fa-shield' },
    { id: 'tankpad', name: 'Protector de depósito',   price: 60,  icon: 'fa-gas-pump' },
    { id: 'stripes', name: 'Vinilos de llanta',       price: 45,  icon: 'fa-circle-notch' },
    { id: 'axle',    name: 'Protectores de eje',      price: 90,  icon: 'fa-circle-dot' }
  ];
  ZX.BASE_PRICE_USD = 9999; // precio de referencia editable en la cotización
  ZX.CURRENCIES = [
    { id: 'USD', symbol: 'US$', rate: 1, decimals: 0 },
    { id: 'COP', symbol: 'COP $', rate: 4000, decimals: 0 },
    { id: 'MXN', symbol: 'MX$', rate: 18, decimals: 0 },
    { id: 'EUR', symbol: '€', rate: 0.92, decimals: 0 }
  ];

  // ---------- Modos de conducción ----------
  ZX.RIDE_MODES = {
    sport: { name: 'SPORT', power: 'F', ktrc: 1, desc: 'Potencia Full y KTRC nivel 1: máxima respuesta para conducción deportiva y circuito.' },
    road:  { name: 'ROAD',  power: 'F', ktrc: 2, desc: 'Potencia Full y KTRC nivel 2: equilibrio para el día a día.' },
    rain:  { name: 'RAIN',  power: 'L', ktrc: 3, desc: 'Potencia Low y KTRC nivel 3: entrega suave y máxima seguridad sobre mojado.' },
    rider: { name: 'RIDER', power: null, ktrc: null, desc: 'Personalizable: elige tú la potencia (Full / Low) y el nivel de KTRC (1, 2, 3 u OFF).' }
  };
})();

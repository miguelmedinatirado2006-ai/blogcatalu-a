import { RouteItem } from '../types/route';

export const STARTER_ROUTES: Omit<RouteItem, 'id' | 'authorId' | 'createdAtMs' | 'updatedAtMs'>[] = [
  {
    title: 'Priorat entre bancales de pizarra y la sierra del Montsant',
    comarca: 'Priorat',
    introduction:
      'Un recorrido pausado por carreteras secundarias de firme impecable que enlazan los pueblos de piedra de Siurana, Cornudella y Escaladei entre viñedos en cuesta y paredones calizos.',
    coverImage: '/src/assets/images/route_car_priorat_1794834007210.jpg',
    modes: ['coche', 'moto'],
    otherModeDetail: '',
    distanceKm: 78,
    duration: '2 h 40 min',
    difficulty: 'Moderada',
    startPoint: 'Cornudella de Montsant',
    elevationGain: '+1.180 m',
    wikilocUrl: 'https://es.wikiloc.com/rutas-en-coche/priorat-siurana-escaladei-46892341',
    googleMapsUrl: 'https://www.google.com/maps/place/Siurana,+Tarragona',
    articleBody: `## El despertar de la licorella

Salimos de Cornudella de Montsant con la primera luz de la mañana, cuando la niebla todavía se recoge en el fondo del embalse y los riscos de Siurana empiezan a teñirse de ocre. La carretera C-242 y los tramos locales hacia Escaladei ofrecen un asfalto limpio y un trazado sinuoso pensado para disfrutar sin prisas.

![Curvas entre bancales de viña camino de Escaladei](/src/assets/images/route_car_priorat_1794834007210.jpg)

A medida que descendemos hacia el corazón del Priorat histórico, los bancales de pizarra —la célebre *licorella*— marcan el paisaje. Conviene detenerse en los apartaderos señalizados junto a las bodegas familiares y observar cómo la vid se agarra a pendientes casi verticales.

> La mejor manera de recorrer el Priorat es aceptar que cada curva es un mirador y cada pueblo pide veinte minutos de paseo a pie.

### Parada en la Cartuja de Escaladei

El tramo que bordea la cara sur del Montsant conduce directamente a las ruinas de la Cartuja de Santa María de Escaladei, fundada en el siglo XII. La explanada exterior ofrece sombra bajo los cipreses y un silencio absoluto antes de afrontar el regreso por Gratallops y Torroja.`,
    recommendations:
      'Realizar la ruta en primavera u otoño para disfrutar del cambio de color en los viñedos y evitar el calor intenso del mediodía. Reservar con antelación si se desea visitar alguna bodega de la DOQ Priorat o comer en Siurana.',
    tips:
      'En los últimos kilómetros de subida a Siurana la calzada se estrecha y el aparcamiento es limitado los fines de semana: conviene llegar antes de las 10:30. Revisar el nivel de combustible en Cornudella o Falset antes de internarse en las carreteras interiores.',
    published: true,
  },
  {
    title: 'Costas del Garraf, Pantano de Foix y regreso por Olivella',
    comarca: 'Garraf · Alt Penedès',
    introduction:
      'Clásica matinal sobre dos ruedas que combina los acantilados blancos de la C-31 frente al Mediterráneo con el interior solitario del Parque del Garraf y las curvas enlazadas hacia Castellet.',
    coverImage: '/src/assets/images/route_moto_garraf_1794834007136.jpg',
    modes: ['moto', 'coche'],
    otherModeDetail: '',
    distanceKm: 64,
    duration: '1 h 50 min',
    difficulty: 'Fácil',
    startPoint: 'Castelldefels (Port Ginesta)',
    elevationGain: '+740 m',
    wikilocUrl: 'https://es.wikiloc.com/rutas-motociclismo/costes-del-garraf-panta-de-foix-28145120',
    googleMapsUrl: 'https://www.google.com/maps/place/Castellet+i+la+Gornal,+Barcelona',
    articleBody: `## Acantilados sobre el Mediterráneo

Pocas carreteras en Cataluña ofrecen una transición tan inmediata entre el mar abierto y el bosque mediterráneo como las Costas del Garraf. Arrancando desde Port Ginesta a primera hora, las doce primeras curvas suspendidas sobre calas de piedra blanca regalan una visión limpia del horizonte.

![Carretera costera del Garraf al amanecer](/src/assets/images/route_moto_garraf_1794834007136.jpg)

Tras dejar atrás Sitges, giramos hacia el interior por la BV-2115 rumbo al pantano de Foix. El tráfico desaparece casi por completo y el trazado se vuelve rítmico, sombreado por pinos carrascos y encinas hasta llegar al perfil medieval del castillo de Castellet.

### Vuelta por el macizo del Garraf

Para el regreso, la carretera de Olivella y Jafra cruza el corazón kárstico del parque natural entre masías aisladas y piedra calcárea antes de descender de nuevo hacia Gavà.`,
    recommendations:
      'Ideal para primera hora del sábado o domingo (entre las 8:00 y las 10:00) para rodar con tráfico despejado. Café y parada obligatoria en el mirador frente al castillo de Castellet sobre el pantano.',
    tips:
      'Precaución en la C-31 por presencia habitual de ciclistas y ráfagas laterales de viento en los viaductos costeros. En los tramos umbríos cercanos al pantano de Foix puede haber humedad en el asfalto durante los meses de invierno.',
    published: true,
  },
  {
    title: 'Congost de Mont-rebei por el camino excavado en la roca',
    comarca: 'Pallars Jussà · Noguera',
    introduction:
      'Travesía a pie por uno de los desfiladeros más impresionantes de Cataluña, siguiendo el sendero tallado directamente sobre la pared vertical del Montsec sobre aguas de color turquesa.',
    coverImage: '/src/assets/images/route_hike_montrebei_1794834007700.jpg',
    modes: ['a_pie'],
    otherModeDetail: '',
    distanceKm: 11.4,
    duration: '3 h 45 min',
    difficulty: 'Moderada',
    startPoint: 'Aparcamiento de La Masieta',
    elevationGain: '+410 m',
    wikilocUrl: 'https://es.wikiloc.com/rutas-senderismo/congost-de-mont-rebei-desde-la-masieta-14928374',
    googleMapsUrl: 'https://www.google.com/maps/place/Congost+de+Mont-rebei',
    articleBody: `## Sobre el desfiladero de la Noguera Ribagorzana

Desde el aparcamiento de La Masieta el sendero desciende suavemente hacia el primer puente colgante sobre el río, donde la vegetación de ribera anticipa el estrechamiento del cañón. En pocos minutos la pared de la sierra del Montsec se eleva más de quinientos metros sobre nuestras cabezas.

![Sendero tallado en la pared caliza del Congost de Mont-rebei](/src/assets/images/route_hike_montrebei_1794834007700.jpg)

El tramo central es inolvidable: una galería excavada a pico en la roca caliza, equipada con sirga de acero en todo su recorrido para caminar con seguridad mientras se contempla el color esmeralda del río en el fondo del tajo.

> Conviene detenerse en los ensanches de la pared para ceder el paso y escuchar cómo rebota el eco del agua en el cañón.

### Cruce del puente colgante del Seguer

Quienes deseen alargar ligeramente la jornada pueden descender al segundo puente colgante del barranco del Seguer antes de emprender el regreso por el mismo trazado.`,
    recommendations:
      'Llevar al menos 1,5 litros de agua por persona, calzado de montaña con buena suela adherente y gorra, ya que apenas hay sombra en la aproximación inicial.',
    tips:
      'El acceso en vehículo al aparcamiento de La Masieta requiere reserva previa de plaza en temporada alta y puentes festivos. No es una ruta recomendable en días de viento fuerte o si se padece vértigo acusado, aunque el paso cuenta con pasamanos de cable continuo.',
    published: true,
  },
];

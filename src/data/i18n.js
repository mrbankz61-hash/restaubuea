/**
 * Every interface string, in English and French.
 * `{name}`-style tokens are filled in by the site. Keep them in both languages.
 * Dish names and descriptions live in menu.js.
 */

export const LANGS = ['en', 'fr'];
export const DEFAULT_LANG = 'en';

export const STRINGS = {
  en: {
    'meta.title': 'Ndolé House · Cameroonian kitchen in Molyko, Buea',
    'meta.description':
      'Ndolé, eru, poisson braisé, soya and fresh folere at the foot of Mount Cameroon. See the menu, prices in FCFA and opening hours, then order on WhatsApp.',

    'skip': 'Skip to the menu',
    'nav.home': 'Ndolé House, back to the top',
    'nav.menu': 'Menu',
    'nav.basket': 'Basket',
    'nav.basketAria': 'Open your basket',
    'nav.lang': 'Language',
    'nav.chapters': 'Journey chapters',

    'chapter.arrival': 'Arrival',
    'chapter.street': 'Molyko',
    'chapter.door': 'Come in',
    'chapter.menu': 'The menu',
    'chapter.kitchen': 'Kitchen',
    'chapter.visit': 'Find us & order',

    'loader.label': 'Lighting the fire',

    'hours.title': 'Opening hours',
    'hours.closed': 'Closed',
    'hours.open': 'Open now · until {time}',
    'hours.opensToday': 'Closed · opens at {time}',
    'hours.opensTomorrow': 'Closed · opens tomorrow {time}',
    'hours.opensDay': 'Closed · opens {day} {time}',
    'hours.unknown': 'Call us for opening hours',

    'day.mon': 'Mon',
    'day.tue': 'Tue',
    'day.wed': 'Wed',
    'day.thu': 'Thu',
    'day.fri': 'Fri',
    'day.sat': 'Sat',
    'day.sun': 'Sun',
    'dayLong.mon': 'Monday',
    'dayLong.tue': 'Tuesday',
    'dayLong.wed': 'Wednesday',
    'dayLong.thu': 'Thursday',
    'dayLong.fri': 'Friday',
    'dayLong.sat': 'Saturday',
    'dayLong.sun': 'Sunday',

    'hero.eyebrow': 'Cameroonian kitchen · Molyko, Buea',
    'hero.lede':
      'Slow-cooked ndolé, charcoal-grilled fish and cold folere at the foot of Mount Cameroon.',
    'hero.from': 'Dishes from {price}',
    'hero.where': 'Molyko, Buea',
    'hero.scroll': 'Scroll to walk in',

    'cta.menu': 'Menu & prices',
    'cta.order': 'Order on WhatsApp',

    'street.kicker': 'Molyko, after dark',
    'street.title': 'Follow the smoke.',
    'street.body':
      'Past the call boxes, the soya grills and the moto-taxis, one door glows at the end of the road.',

    'door.title': 'Una welcome.',
    'door.body': 'Come in. The pot has been on the fire since morning.',

    'menu.kicker': 'The table',
    'menu.title': "Today's menu",
    'menu.sub': 'Prices in FCFA. Add dishes, then send your order on WhatsApp.',
    'menu.add': 'Add',
    'menu.addAria': 'Add {name} to your basket',
    'menu.decAria': 'Remove one {name}',
    'menu.qtyLabel': 'in basket',
    'menu.spicy': 'Spicy',
    'menu.verySpicy': 'Very spicy',
    'menu.dish': 'Dish',

    'kitchen.kicker': 'The kitchen',
    'kitchen.title': 'Cooked fresh since {time}.',
    'kitchen.body':
      'Charcoal on the grill, ndolé on the fire and juices pressed every morning. When a pot is finished, it is finished.',

    'visit.kicker': 'Find us',
    'visit.title': 'Come hungry, or order ahead.',
    'visit.address': 'Address',
    'visit.phone': 'Phone',
    'visit.directions': 'Open in Google Maps',
    'visit.order': 'Your order',
    'visit.edit': 'Edit basket',

    'basket.title': 'Your basket',
    'basket.empty': 'Your basket is empty. Add a dish from the menu, or just say hello on WhatsApp.',
    'basket.total': 'Total',
    'basket.item.one': '{count} item',
    'basket.item.other': '{count} items',
    'basket.added': '{name} added. {count} in your basket.',
    'basket.removed': '{name} removed.',
    'basket.note': 'We reply on WhatsApp to confirm your total and pickup time.',
    'basket.clear': 'Clear basket',

    'sheet.close': 'Close',
    'sheet.menuTitle': 'Menu & prices',
    'sheet.menuNote': 'All prices in FCFA.',

    'wa.greeting': "Hello Ndolé House! I'd like to order:",
    'wa.total': 'Total: {total}',
    'wa.empty': "Hello Ndolé House! What's on the menu today?",
    'wa.details': 'Name:\nPickup or delivery:',

    'footer.line': 'Cameroonian kitchen in Molyko, Buea.',
    'footer.prices': 'All prices in FCFA.',
    'footer.builtBy': 'Concept website designed and built by',
    'footer.code': 'Source code',
    'footer.credits': 'Photo credits',
    'footer.creditsNote': 'Dish photos via Wikimedia Commons, cropped and resized. Photos are illustrative and may differ from the dishes served.',
  },

  fr: {
    'meta.title': 'Ndolé House · Cuisine camerounaise à Molyko, Buea',
    'meta.description':
      'Ndolé, eru, poisson braisé, soya et foléré frais au pied du mont Cameroun. Menu, prix en FCFA et horaires, puis commande sur WhatsApp.',

    'skip': 'Aller au menu',
    'nav.home': 'Ndolé House, retour en haut',
    'nav.menu': 'Menu',
    'nav.basket': 'Panier',
    'nav.basketAria': 'Ouvrir votre panier',
    'nav.lang': 'Langue',
    'nav.chapters': 'Chapitres du parcours',

    'chapter.arrival': 'Arrivée',
    'chapter.street': 'Molyko',
    'chapter.door': 'Entrez',
    'chapter.menu': 'La carte',
    'chapter.kitchen': 'Cuisine',
    'chapter.visit': 'Venir & commander',

    'loader.label': 'On allume le feu',

    'hours.title': "Heures d'ouverture",
    'hours.closed': 'Fermé',
    'hours.open': "Ouvert · jusqu'à {time}",
    'hours.opensToday': 'Fermé · ouvre à {time}',
    'hours.opensTomorrow': 'Fermé · ouvre demain à {time}',
    'hours.opensDay': 'Fermé · ouvre {day} à {time}',
    'hours.unknown': 'Appelez-nous pour les horaires',

    'day.mon': 'lun.',
    'day.tue': 'mar.',
    'day.wed': 'mer.',
    'day.thu': 'jeu.',
    'day.fri': 'ven.',
    'day.sat': 'sam.',
    'day.sun': 'dim.',
    'dayLong.mon': 'lundi',
    'dayLong.tue': 'mardi',
    'dayLong.wed': 'mercredi',
    'dayLong.thu': 'jeudi',
    'dayLong.fri': 'vendredi',
    'dayLong.sat': 'samedi',
    'dayLong.sun': 'dimanche',

    'hero.eyebrow': 'Cuisine camerounaise · Molyko, Buea',
    'hero.lede':
      'Ndolé mijoté, poisson braisé au charbon et foléré bien frais, au pied du mont Cameroun.',
    'hero.from': 'Plats dès {price}',
    'hero.where': 'Molyko, Buea',
    'hero.scroll': 'Défilez pour entrer',

    'cta.menu': 'Menu & prix',
    'cta.order': 'Commander sur WhatsApp',

    'street.kicker': 'Molyko, à la tombée de la nuit',
    'street.title': 'Suivez la fumée.',
    'street.body':
      'Après les call-box, les grilleurs de soya et les motos-taxis, une porte brille au bout de la rue.',

    'door.title': 'Una welcome.',
    'door.body': 'Entrez. La marmite est sur le feu depuis ce matin.',

    'menu.kicker': 'La table',
    'menu.title': 'Le menu du jour',
    'menu.sub': 'Prix en FCFA. Ajoutez vos plats, puis envoyez la commande sur WhatsApp.',
    'menu.add': 'Ajouter',
    'menu.addAria': 'Ajouter {name} au panier',
    'menu.decAria': 'Retirer un {name}',
    'menu.qtyLabel': 'au panier',
    'menu.spicy': 'Pimenté',
    'menu.verySpicy': 'Très pimenté',
    'menu.dish': 'Plat',

    'kitchen.kicker': 'La cuisine',
    'kitchen.title': 'Cuisiné frais depuis {time}.',
    'kitchen.body':
      "Charbon sur le grill, ndolé sur le feu et jus pressés chaque matin. Quand la marmite est vide, c'est fini.",

    'visit.kicker': 'Nous trouver',
    'visit.title': "Venez avec l'appétit, ou commandez à l'avance.",
    'visit.address': 'Adresse',
    'visit.phone': 'Téléphone',
    'visit.directions': 'Ouvrir dans Google Maps',
    'visit.order': 'Votre commande',
    'visit.edit': 'Modifier le panier',

    'basket.title': 'Votre panier',
    'basket.empty': 'Votre panier est vide. Ajoutez un plat, ou dites simplement bonjour sur WhatsApp.',
    'basket.total': 'Total',
    'basket.item.one': '{count} article',
    'basket.item.other': '{count} articles',
    'basket.added': '{name} ajouté. {count} dans votre panier.',
    'basket.removed': '{name} retiré.',
    'basket.note': "Nous répondons sur WhatsApp pour confirmer le total et l'heure de retrait.",
    'basket.clear': 'Vider le panier',

    'sheet.close': 'Fermer',
    'sheet.menuTitle': 'Menu & prix',
    'sheet.menuNote': 'Tous les prix en FCFA.',

    'wa.greeting': 'Bonjour Ndolé House ! Je voudrais commander :',
    'wa.total': 'Total : {total}',
    'wa.empty': "Bonjour Ndolé House ! Qu'y a-t-il au menu aujourd'hui ?",
    'wa.details': 'Nom :\nÀ emporter ou livraison :',

    'footer.line': 'Cuisine camerounaise à Molyko, Buea.',
    'footer.prices': 'Tous les prix en FCFA.',
    'footer.builtBy': 'Site concept conçu et réalisé par',
    'footer.code': 'Code source',
    'footer.credits': 'Crédits photo',
    'footer.creditsNote': 'Photos des plats via Wikimedia Commons, recadrées et redimensionnées. Photos non contractuelles.',
  },
};

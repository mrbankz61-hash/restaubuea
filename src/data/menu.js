/**
 * Ndolé House: everything the owner edits lives in this file and in i18n.js.
 *
 *  - Change a price: edit `price` (plain number, in FCFA).
 *  - Rename a dish or change its description: edit `name` / `desc` (both languages).
 *  - Add a dish: copy one block in DISHES. The 3D table makes room for it automatically.
 *    `model` picks the 3D plate: ndole, eru, fish, soya, achu, puffpuff, juice (+ `tint`).
 *    Any other value shows a covered plate.
 *  - Remove a dish: delete its block.
 *  - Change opening hours: edit RESTAURANT.hours ("HH:MM" 24h, or null when closed).
 *  - Change a dish photo: put the picture in photos/ named after it (photos/ndole.jpg), run
 *    `npm run photos`, and set `photo: 'ndole'`. Remove `credit` for your own photos; keep it
 *    for photos by other people (it is shown under "Photo credits" in the footer).
 *    Leave `photo` out and the card simply has no picture.
 */

/** WhatsApp number that receives orders: country code + number, digits only. */
export const WHATSAPP_NUMBER = '237671186258';

/** Who designed and built the site (shown in the footer). */
export const SITE_CREDIT = {
  studio: 'TREDEV',
  name: 'Tchinda Raoul Emmanuel',
  email: 'bankyrex2@gmail.com',
  code: 'https://github.com/mrbankz61-hash/restaubuea',
};

export const RESTAURANT = {
  name: 'Ndolé House',
  phone: '+237 671 18 62 58',
  address: {
    en: 'Molyko, Buea, South-West Region, Cameroon',
    fr: 'Molyko, Buea, Région du Sud-Ouest, Cameroun',
  },
  locality: 'Buea',
  district: 'Molyko',
  region: 'South-West',
  country: 'CM',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Molyko%2C%20Buea%2C%20Cameroon',
  timezone: 'Africa/Douala',
  hours: {
    mon: ['10:00', '22:00'],
    tue: ['10:00', '22:00'],
    wed: ['10:00', '22:00'],
    thu: ['10:00', '22:00'],
    fri: ['10:00', '22:00'],
    sat: ['10:00', '22:00'],
    sun: null,
  },
};

export const DISHES = [
  {
    id: 'ndole',
    price: 2500,
    photo: 'ndole',
    credit: { by: 'Giftcup', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Ndole_and_Ripe_Plantains.jpg' },
    model: 'ndole',
    spicy: 0,
    name: { en: 'Ndolé & plantain', fr: 'Ndolé & plantain' },
    desc: {
      en: 'Bitter-leaf stew slow-cooked with groundnuts, prawns and beef, with ripe plantain.',
      fr: 'Ndolé mijoté aux arachides, crevettes et bœuf, servi avec du plantain mûr.',
    },
  },
  {
    id: 'eru',
    price: 2000,
    photo: 'eru',
    credit: { by: 'Minette Lontsie', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Water_fufu_and_Eru.jpg' },
    model: 'eru',
    spicy: 1,
    name: { en: 'Eru & water fufu', fr: 'Eru & water fufu' },
    desc: {
      en: 'Eru and waterleaf simmered in palm oil with crayfish, kanda and smoked fish.',
      fr: "Eru et waterleaf mijotés à l'huile de palme, écrevisses, kanda et poisson fumé.",
    },
  },
  {
    id: 'poisson-braise',
    price: 4000,
    photo: 'poisson-braise',
    credit: { by: 'Aso bolo', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', source: 'https://commons.wikimedia.org/wiki/File:Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun,_Kribi.JPG' },
    model: 'fish',
    spicy: 2,
    name: { en: 'Grilled fish (poisson braisé)', fr: 'Poisson braisé' },
    desc: {
      en: 'Whole fish marinated in pepper and ginger, grilled over charcoal, with miondo.',
      fr: 'Poisson entier mariné au piment et au gingembre, braisé au charbon, avec miondo.',
    },
  },
  {
    id: 'soya',
    price: 1500,
    photo: 'soya',
    credit: { by: 'Adesolive', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Soya_or_Suya.jpg' },
    model: 'soya',
    spicy: 2,
    name: { en: 'Soya skewers', fr: 'Brochettes de soya' },
    desc: {
      en: 'Three beef skewers off the grill, dusted with soya pepper, onions and chilli.',
      fr: 'Trois brochettes de bœuf grillées, poivre soya, oignons et piment.',
    },
  },
  {
    id: 'achu',
    price: 3000,
    photo: 'achu',
    credit: { by: 'OlgaEmma', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Achu_and_Yellow_Soup_with_vegetable.jpg' },
    model: 'achu',
    spicy: 2,
    name: { en: 'Achu & yellow soup', fr: 'Achu & sauce jaune' },
    desc: {
      en: 'Pounded cocoyam with yellow soup of palm oil, kanwa and spices, served with kanda.',
      fr: "Taro pilé et sauce jaune à l'huile de palme, kanwa et épices, servi avec du kanda.",
    },
  },
  {
    id: 'puff-puff-beans',
    price: 800,
    photo: 'puff-puff-beans',
    credit: { by: 'Minette Lontsie', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Beignets_haricot_bouillie_(BHB).jpg' },
    model: 'puffpuff',
    spicy: 1,
    name: { en: 'Puff-puff & beans', fr: 'Beignets-haricots' },
    desc: {
      en: 'Golden puff-puff with spiced beans in red oil. The Molyko breakfast classic.',
      fr: "Beignets dorés et haricots épicés à l'huile rouge. Le classique du matin à Molyko.",
    },
  },
  {
    id: 'folere',
    price: 500,
    photo: 'folere',
    credit: { by: 'claralieu', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/', source: 'https://commons.wikimedia.org/wiki/File:A_glass_of_hibiscus_tea_01.jpg' },
    model: 'juice',
    tint: '#8d1634',
    spicy: 0,
    name: { en: 'Folere juice', fr: 'Jus de foléré' },
    desc: {
      en: 'Chilled hibiscus with fresh ginger and a hint of pineapple.',
      fr: "Hibiscus glacé au gingembre frais et une touche d'ananas.",
    },
  },
  {
    id: 'ginger',
    price: 500,
    photo: 'ginger',
    credit: { by: 'Lamine Kane', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Jus_de_gingembre_pour_rompre_le_je%C3%BBne.jpg' },
    model: 'juice',
    tint: '#d9a441',
    spicy: 1,
    name: { en: 'Ginger juice', fr: 'Jus de gingembre' },
    desc: {
      en: 'Fresh-pressed ginger with lemon and honey. It bites back.',
      fr: 'Gingembre frais pressé, citron et miel. Ça pique !',
    },
  },
];

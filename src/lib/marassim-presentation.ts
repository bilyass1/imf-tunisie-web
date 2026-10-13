import type { Localized, Project } from './types';

const L = (fr: string, en: string, ar: string): Localized => ({ fr, en, ar });

export const MARASSIM_PRESENTATION = {
  subtitle: L("L'élégance au service de vos événements", 'Elegance for your events', 'الأناقة في خدمة مناسباتكم'),
  description: L(
    "Le Complexe Marassim est un complexe événementiel conçu pour accueillir mariages, réceptions, cérémonies, congrès, conférences, dîners et événements professionnels dans un cadre élégant, spacieux et fonctionnel. Il réunit trois espaces complémentaires ainsi que des infrastructures pensées pour assurer le confort des invités et le bon déroulement de chaque événement.",
    'Complexe Marassim is an event complex designed to host weddings, receptions, ceremonies, congresses, conferences, dinners and corporate events in an elegant, spacious and functional setting. It brings together three complementary spaces and facilities designed for guest comfort and the smooth running of every event.',
    'مركّب مراسم فضاء للمناسبات صُمّم لاستقبال حفلات الزفاف والاستقبال والمراسم والمؤتمرات والندوات وحفلات العشاء والفعاليات المهنية في إطار أنيق وواسع وعملي. يجمع ثلاثة فضاءات متكاملة وتجهيزات تضمن راحة الضيوف وحسن سير كل مناسبة.',
  ),
  sectionTitle: L('Des espaces pour chaque événement', 'Spaces for every event', 'فضاءات لكل مناسبة'),
  nav: L('Espaces et équipements', 'Spaces and facilities', 'الفضاءات والتجهيزات'),
  sections: [
    {
      title: L("SALLE ALMES — Jusqu'à 800 personnes", 'ALMES HALL — Up to 800 guests', 'قاعة ألماس — حتى 800 شخص'),
      body: L("La Salle Almes constitue le grand espace de réception du Complexe Marassim. Avec une capacité pouvant atteindre 800 personnes, elle est particulièrement adaptée aux grands mariages, réceptions, galas, cérémonies, dîners, congrès et événements d'entreprise.", 'Almes Hall is the main reception space at Complexe Marassim. With capacity for up to 800 guests, it is especially suited to large weddings, receptions, galas, ceremonies, dinners, congresses and corporate events.', 'قاعة ألماس هي فضاء الاستقبال الكبير بمركّب مراسم. بسعة تصل إلى 800 شخص، تلائم خصوصاً حفلات الزفاف الكبرى والاستقبال والحفلات والمراسم والعشاء والمؤتمرات وفعاليات الشركات.'),
    },
    {
      title: L("SALLE CHICHKHAN — Jusqu'à 400 personnes", 'CHICHKHAN HALL — Up to 400 guests', 'قاعة شيشخان — حتى 400 شخص'),
      body: L("La Salle Chichkhan peut accueillir jusqu'à 400 personnes. Son format permet d'organiser mariages, fiançailles, réceptions privées, dîners, séminaires, conférences et manifestations professionnelles dans une ambiance élégante.", 'Chichkhan Hall can accommodate up to 400 guests. Its layout makes it suitable for weddings, engagements, private receptions, dinners, seminars, conferences and professional events in an elegant atmosphere.', 'تستوعب قاعة شيشخان حتى 400 شخص. يتيح تصميمها تنظيم حفلات الزفاف والخطوبة والاستقبال الخاص والعشاء والندوات والمؤتمرات والفعاليات المهنية في أجواء أنيقة.'),
    },
    {
      title: L("ESPACE RAYEN — Jusqu'à 1 000 personnes", 'RAYEN SPACE — Up to 1,000 guests', 'فضاء ريان — حتى 1,000 شخص'),
      body: L("L'Espace Rayen est un vaste espace événementiel extérieur à ciel ouvert pouvant accueillir jusqu'à 1 000 personnes. Il offre un cadre privilégié pour les cérémonies en plein air, cocktails, soirées, dîners, réceptions et grands événements estivaux.", 'Rayen is a spacious open-air event venue accommodating up to 1,000 guests. It offers a special setting for outdoor ceremonies, cocktail receptions, evening events, dinners, receptions and major summer events.', 'فضاء ريان فضاء خارجي واسع في الهواء الطلق يستوعب حتى 1,000 شخص. يوفر إطاراً مميزاً للمراسم الخارجية وحفلات الكوكتيل والسهرات والعشاء والاستقبال والمناسبات الصيفية الكبرى.'),
    },
    {
      title: L('CUISINE PROFESSIONNELLE', 'PROFESSIONAL KITCHEN', 'مطبخ مهني'),
      body: L("Le Complexe Marassim dispose d'une cuisine professionnelle dédiée aux événements avec restauration et service de dîner. Cette infrastructure permet d'assurer la préparation et l'organisation des prestations culinaires directement au sein du complexe pour les mariages, banquets, galas, congrès et grandes réceptions.", 'Complexe Marassim has a professional kitchen dedicated to events with catering and dinner service. This facility allows food preparation and culinary services to be organised on site for weddings, banquets, galas, congresses and large receptions.', 'يضم مركّب مراسم مطبخاً مهنياً مخصصاً للمناسبات التي تشمل خدمات الطعام والعشاء. يتيح هذا المرفق إعداد وتنظيم الخدمات الغذائية داخل المركّب لحفلات الزفاف والمآدب والحفلات والمؤتمرات والاستقبالات الكبرى.'),
    },
    {
      title: L("PARKING INTÉRIEUR — Jusqu'à 100 véhicules", 'ON-SITE PARKING — Up to 100 vehicles', 'موقف داخل المركّب — حتى 100 سيارة'),
      body: L("Pour faciliter l'accès et améliorer le confort des invités, le Complexe Marassim dispose d'un espace de stationnement à l'intérieur de son enceinte pouvant accueillir jusqu'à 100 véhicules.", 'To make access easier and improve guest comfort, Complexe Marassim offers parking within its grounds for up to 100 vehicles.', 'لتسهيل الوصول وتحسين راحة الضيوف، يوفر مركّب مراسم مساحة لوقوف السيارات داخل أسواره تستوعب حتى 100 سيارة.'),
    },
    {
      title: L('GROUPE ÉLECTROGÈNE DE SECOURS', 'BACKUP GENERATOR', 'مولّد كهربائي احتياطي'),
      body: L("Afin de contribuer à la continuité des événements en cas de coupure du réseau électrique, le Complexe Marassim est équipé d'un groupe électrogène de secours destiné à maintenir l'alimentation des installations essentielles.", 'To help events continue during a mains power outage, Complexe Marassim is equipped with a backup generator intended to maintain power to essential installations.', 'للمساهمة في استمرارية المناسبات عند انقطاع التيار الكهربائي، جُهّز مركّب مراسم بمولّد احتياطي للحفاظ على تغذية التجهيزات الأساسية.'),
    },
  ],
  summaryTitle: L('MARASSIM, UNE OFFRE ÉVÉNEMENTIELLE COMPLÈTE', 'MARASSIM, A COMPLETE EVENT OFFERING', 'مراسم، عرض متكامل للمناسبات'),
  summary: L("Grâce à ses capacités d'accueil, ses espaces complémentaires et ses équipements, le Complexe Marassim offre une solution complète pour l'organisation de mariages, grandes réceptions, dîners, congrès et événements professionnels ou institutionnels.", 'With its guest capacities, complementary spaces and facilities, Complexe Marassim offers a complete solution for weddings, large receptions, dinners, congresses and professional or institutional events.', 'بفضل قدرات الاستقبال وفضاءاته المتكاملة وتجهيزاته، يوفر مركّب مراسم حلاً شاملاً لتنظيم حفلات الزفاف والاستقبال الكبير والعشاء والمؤتمرات والفعاليات المهنية والمؤسسية.'),
  capacities: L('Salle Almes : 800 personnes • Salle Chichkhan : 400 personnes • Espace Rayen : 1 000 personnes', 'Almes Hall: 800 guests • Chichkhan Hall: 400 guests • Rayen Space: 1,000 guests', 'قاعة ألماس: 800 شخص • قاعة شيشخان: 400 شخص • فضاء ريان: 1,000 شخص'),
  facilities: L('Cuisine professionnelle • Parking intérieur : 100 véhicules • Groupe électrogène de secours', 'Professional kitchen • On-site parking: 100 vehicles • Backup generator', 'مطبخ مهني • موقف داخل المركّب: 100 سيارة • مولّد كهربائي احتياطي'),
  closing: L("Complexe Marassim — Recevoir, célébrer et partager dans un cadre d'exception.", 'Complexe Marassim — Welcome, celebrate and share in an exceptional setting.', 'مركّب مراسم — استقبال واحتفال ومشاركة في إطار استثنائي.'),
};

export const MARASSIM_PROJECT_CONTENT: Pick<Project, 'subtitle' | 'description' | 'highlights' | 'specs' | 'amenities'> = {
  subtitle: MARASSIM_PRESENTATION.subtitle,
  description: MARASSIM_PRESENTATION.description,
  highlights: [
    L('Salle Almes : jusqu’à 800 personnes', 'Almes Hall: up to 800 guests', 'قاعة ألماس: حتى 800 شخص'),
    L('Salle Chichkhan : jusqu’à 400 personnes', 'Chichkhan Hall: up to 400 guests', 'قاعة شيشخان: حتى 400 شخص'),
    L('Espace Rayen : jusqu’à 1 000 personnes', 'Rayen Space: up to 1,000 guests', 'فضاء ريان: حتى 1,000 شخص'),
    MARASSIM_PRESENTATION.sections[3].title,
    L('Parking intérieur : jusqu’à 100 véhicules', 'On-site parking: up to 100 vehicles', 'موقف داخل المركّب: حتى 100 سيارة'),
    MARASSIM_PRESENTATION.sections[5].title,
  ],
  specs: [
    { label: L('Nature', 'Type', 'الطبيعة'), value: L('Complexe événementiel', 'Event complex', 'مركّب للمناسبات') },
    { label: L('Salle Almes', 'Almes Hall', 'قاعة ألماس'), value: L('Jusqu’à 800 personnes', 'Up to 800 guests', 'حتى 800 شخص') },
    { label: L('Salle Chichkhan', 'Chichkhan Hall', 'قاعة شيشخان'), value: L('Jusqu’à 400 personnes', 'Up to 400 guests', 'حتى 400 شخص') },
    { label: L('Espace Rayen', 'Rayen Space', 'فضاء ريان'), value: L('À ciel ouvert · Jusqu’à 1 000 personnes', 'Open air · Up to 1,000 guests', 'في الهواء الطلق · حتى 1,000 شخص') },
    { label: L('Parking intérieur', 'On-site parking', 'موقف داخل المركّب'), value: L('Jusqu’à 100 véhicules', 'Up to 100 vehicles', 'حتى 100 سيارة') },
    { label: L('Restauration', 'Catering', 'خدمات الطعام'), value: L('Cuisine professionnelle', 'Professional kitchen', 'مطبخ مهني') },
    { label: L('Alimentation de secours', 'Backup power', 'التغذية الاحتياطية'), value: L('Groupe électrogène de secours', 'Backup generator', 'مولّد كهربائي احتياطي') },
  ],
  amenities: ['parking'],
};

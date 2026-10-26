// Step-by-step recipes for each dish (keyed by dish id from data/dishes.ts).
// Family-friendly, concise French. Shown in the calendar's tap-to-open recipe sheet.
export type Recipe = { steps: string[]; tip?: string };

export const RECIPES: Record<string, Recipe> = {
  // Entrées
  "e-tomate-mozza": {
    steps: [
      "Coupe 3 tomates et 2 boules de mozzarella en tranches.",
      "Dispose-les en alternance dans un plat.",
      "Arrose d'un filet d'huile d'olive et de vinaigre balsamique.",
      "Sale, poivre et parsème de basilic frais.",
    ],
    tip: "Sors la mozzarella du frigo 15 min avant pour plus de goût.",
  },
  "e-soupe-legumes": {
    steps: [
      "Épluche et coupe carottes, pommes de terre, poireaux et courgettes en morceaux.",
      "Fais revenir les légumes 5 min dans un peu d'huile.",
      "Couvre d'eau, sale et ajoute un cube de bouillon.",
      "Laisse mijoter 25 min à couvert.",
      "Mixe jusqu'à obtenir une texture lisse.",
    ],
    tip: "Une cuillère de crème fraîche à la fin adoucit la soupe.",
  },
  "e-veloute-potiron": {
    steps: [
      "Épluche et coupe 800 g de potiron en cubes.",
      "Fais revenir un oignon émincé dans du beurre.",
      "Ajoute le potiron, couvre d'eau et un cube de bouillon.",
      "Laisse cuire 20 min jusqu'à ce que le potiron soit tendre.",
      "Mixe avec un peu de crème jusqu'à obtenir un velouté.",
    ],
    tip: "Une pincée de noix de muscade relève bien le potiron.",
  },
  "e-soupe-oignon": {
    steps: [
      "Émince 4 gros oignons finement.",
      "Fais-les dorer 15 min à feu doux dans du beurre.",
      "Saupoudre d'une cuillère de farine et mélange.",
      "Verse 1 L de bouillon et laisse mijoter 20 min.",
      "Répartis dans des bols, ajoute du pain et du fromage râpé.",
      "Passe sous le gril 5 min jusqu'à ce que le fromage gratine.",
    ],
    tip: "Des oignons bien dorés font toute la saveur, ne les brûle pas.",
  },
  "e-oeufs-mimosa": {
    steps: [
      "Fais cuire 6 œufs 10 min dans l'eau bouillante.",
      "Passe-les sous l'eau froide et écale-les.",
      "Coupe les œufs en deux et retire les jaunes.",
      "Écrase les jaunes avec 2 cuillères de mayonnaise.",
      "Garnis les blancs de ce mélange à la cuillère.",
      "Parsème du reste de jaune émietté sur le dessus.",
    ],
    tip: "Une pointe de moutarde dans la farce donne du peps.",
  },
  "e-avocat-crevettes": {
    steps: [
      "Coupe 2 avocats en deux et retire les noyaux.",
      "Décortique 200 g de crevettes cuites.",
      "Mélange 3 cuillères de mayonnaise avec un peu de ketchup et de citron.",
      "Dispose les crevettes dans le creux des avocats.",
      "Nappe de sauce cocktail et sers frais.",
    ],
    tip: "Citronne les avocats pour éviter qu'ils noircissent.",
  },
  "e-quiche-lorraine": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Étale une pâte brisée dans un moule et pique le fond.",
      "Fais revenir 200 g de lardons à la poêle.",
      "Bats 3 œufs avec 20 cl de crème, sel et poivre.",
      "Répartis les lardons sur la pâte et verse l'appareil.",
      "Enfourne 35 min jusqu'à ce que la quiche soit dorée.",
    ],
    tip: "Une pincée de muscade dans l'appareil, c'est la vraie recette.",
  },
  "e-quiche-poireaux": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Émince 3 poireaux et fais-les fondre 15 min à la poêle.",
      "Étale une pâte brisée dans un moule et pique le fond.",
      "Bats 3 œufs avec 20 cl de crème, sel et poivre.",
      "Répartis les poireaux sur la pâte et verse l'appareil.",
      "Enfourne 35 min jusqu'à ce que la quiche soit dorée.",
    ],
    tip: "Ajoute quelques lardons ou du fromage râpé pour plus de gourmandise.",
  },
  "e-melon-jambon": {
    steps: [
      "Coupe un melon bien mûr en deux et retire les pépins.",
      "Détaille la chair en quartiers et retire l'écorce.",
      "Dispose les quartiers dans les assiettes.",
      "Drape une tranche de jambon cru sur chaque quartier.",
    ],
    tip: "Un tour de moulin à poivre sublime le melon.",
  },
  "e-carottes-rapees": {
    steps: [
      "Épluche 4 carottes.",
      "Râpe-les finement.",
      "Prépare une vinaigrette avec huile, citron, sel et une pointe de sucre.",
      "Mélange les carottes avec la vinaigrette.",
    ],
    tip: "Du persil ou quelques raisins secs et ça change tout.",
  },
  "e-charcuterie": {
    steps: [
      "Sors la charcuterie du frigo 15 min avant de servir.",
      "Dispose saucisson, jambon cru et rosette en éventail sur une planche.",
      "Ajoute des cornichons et quelques olives.",
      "Sers avec du pain frais ou grillé.",
    ],
    tip: "Varie les textures avec un peu de pâté ou de terrine.",
  },
  "e-taboule": {
    steps: [
      "Verse 250 g de semoule fine dans un saladier.",
      "Couvre d'eau froide avec du jus de citron et laisse gonfler 1 h.",
      "Coupe tomates, concombre et oignon en petits dés.",
      "Égrène la semoule à la fourchette.",
      "Ajoute les légumes, de la menthe et du persil ciselés.",
      "Arrose d'huile d'olive, sale et mélange.",
    ],
    tip: "Le taboulé est meilleur préparé la veille et servi bien frais.",
  },
  "e-nicoise": {
    steps: [
      "Fais cuire 3 œufs 10 min puis écale-les.",
      "Coupe tomates et œufs en quartiers.",
      "Dispose salade, tomates, thon émietté et œufs dans un saladier.",
      "Ajoute des olives noires et quelques anchois.",
      "Assaisonne d'huile d'olive, vinaigre, sel et poivre.",
    ],
    tip: "La vraie niçoise se fait sans pommes de terre ni légumes cuits.",
  },
  "e-cesar": {
    steps: [
      "Fais cuire 2 filets de poulet à la poêle et coupe-les en lamelles.",
      "Lave et coupe une salade romaine.",
      "Prépare des croûtons en dorant du pain en dés à la poêle.",
      "Mélange la salade avec la sauce César.",
      "Ajoute le poulet, les croûtons et des copeaux de parmesan.",
    ],
    tip: "Une sauce maison au parmesan, ail et anchois change tout.",
  },
  "e-grecque": {
    steps: [
      "Coupe 3 tomates et un concombre en gros morceaux.",
      "Émince un oignon rouge et un poivron.",
      "Ajoute des olives noires et 200 g de feta en cubes.",
      "Arrose d'huile d'olive et d'origan.",
      "Sale légèrement et mélange délicatement.",
    ],
    tip: "La feta est déjà salée, goûte avant de resaler.",
  },
  "e-betterave": {
    steps: [
      "Coupe 2 betteraves cuites en dés.",
      "Émince un peu d'échalote finement.",
      "Prépare une vinaigrette moutarde, huile et vinaigre.",
      "Mélange les betteraves avec l'échalote et la vinaigrette.",
      "Parsème de persil frais.",
    ],
    tip: "Des dés de feta ou des noix apportent du contraste.",
  },
  "e-coleslaw": {
    steps: [
      "Râpe finement un quart de chou blanc et 2 carottes.",
      "Mélange 3 cuillères de mayonnaise avec un peu de vinaigre et de sucre.",
      "Verse la sauce sur les légumes.",
      "Sale, poivre et mélange bien.",
      "Laisse reposer 30 min au frais avant de servir.",
    ],
    tip: "Le repos au frais attendrit le chou et lie les saveurs.",
  },
  "e-saumon-toast": {
    steps: [
      "Fais griller des tranches de pain de mie ou de campagne.",
      "Tartine-les de fromage frais ou de beurre.",
      "Dépose une tranche de saumon fumé sur chaque toast.",
      "Ajoute un filet de citron et un peu d'aneth.",
    ],
    tip: "Un tour de poivre du moulin réveille le saumon.",
  },

  // Plats
  "p-poulet-pates": {
    steps: [
      "Préchauffe le four à 200°C.",
      "Badigeonne un poulet de beurre, sale et poivre.",
      "Enfourne 1 h en l'arrosant de son jus de temps en temps.",
      "Fais bouillir une grande casserole d'eau salée.",
      "Cuis les pâtes selon le temps indiqué sur le paquet.",
      "Sers le poulet découpé avec les pâtes et le jus.",
    ],
    tip: "Glisse un citron et du thym dans le poulet pour le parfumer.",
  },
  "p-poulet-curry": {
    steps: [
      "Coupe 2 filets de poulet en morceaux.",
      "Fais-les dorer à la poêle avec un oignon émincé.",
      "Saupoudre de 2 cuillères de curry et mélange.",
      "Verse 20 cl de crème ou de lait de coco.",
      "Laisse mijoter 15 min à feu doux.",
      "Sers avec du riz cuit à part.",
    ],
    tip: "Une pomme râpée dans la sauce adoucit le curry pour les enfants.",
  },
  "p-steak-frites": {
    steps: [
      "Fais chauffer un bain d'huile ou préchauffe le four à 220°C.",
      "Cuis les frites jusqu'à ce qu'elles soient dorées et croustillantes.",
      "Chauffe une poêle bien chaude avec un peu de beurre.",
      "Saisis les steaks 2 min de chaque côté pour une cuisson à point.",
      "Sale, poivre et laisse reposer 2 min avant de servir.",
    ],
    tip: "Sors la viande du frigo 20 min avant pour une cuisson homogène.",
  },
  "p-saumon-riz": {
    steps: [
      "Fais cuire le riz dans l'eau bouillante salée.",
      "Chauffe une poêle avec un filet d'huile.",
      "Pose les pavés de saumon côté peau et cuis 4 min.",
      "Retourne-les et cuis encore 3 min.",
      "Sale, poivre et arrose de jus de citron.",
      "Sers le saumon sur le riz.",
    ],
    tip: "Le saumon reste moelleux s'il est légèrement rosé au centre.",
  },
  "p-lasagnes": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Prépare une sauce bolognaise avec steak haché, tomates et oignon.",
      "Fais une béchamel avec beurre, farine et lait.",
      "Alterne dans un plat plaques, bolognaise et béchamel.",
      "Termine par de la béchamel et du fromage râpé.",
      "Enfourne 30 min jusqu'à ce que le dessus soit doré.",
    ],
    tip: "Laisse reposer 10 min avant de couper pour des parts nettes.",
  },
  "p-hachis": {
    steps: [
      "Préchauffe le four à 200°C.",
      "Prépare une purée de pommes de terre au beurre et au lait.",
      "Fais revenir 400 g de steak haché avec un oignon émincé.",
      "Étale la viande au fond d'un plat.",
      "Recouvre de purée et lisse la surface.",
      "Parsème de fromage râpé et enfourne 20 min.",
    ],
    tip: "Griffe la purée à la fourchette pour une croûte bien dorée.",
  },
  "p-gratin-dauphinois": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Épluche et coupe 1 kg de pommes de terre en fines rondelles.",
      "Frotte un plat d'ail et beurre-le.",
      "Range les rondelles en couches, sale et poivre.",
      "Couvre de crème et de lait, ajoute un peu de muscade.",
      "Enfourne 1 h et sers avec des tranches de jambon.",
    ],
    tip: "Ne rince pas les pommes de terre, l'amidon lie le gratin.",
  },
  "p-couscous": {
    steps: [
      "Fais revenir poulet et merguez dans une cocotte.",
      "Ajoute oignons, carottes, courgettes et navets.",
      "Verse de l'eau, un cube de bouillon et des épices à couscous.",
      "Laisse mijoter 40 min à couvert.",
      "Prépare la semoule en la gonflant avec de l'eau chaude et du beurre.",
      "Sers la semoule avec la viande, les légumes et le bouillon.",
    ],
    tip: "Ajoute des pois chiches, et l'harissa à part pour les amateurs.",
  },
  "p-blanquette": {
    steps: [
      "Coupe 800 g de veau en cubes et mets-les dans une cocotte.",
      "Couvre d'eau avec carottes, oignon et un bouquet garni.",
      "Laisse mijoter 1 h 30 à feu doux.",
      "Prépare un roux avec beurre et farine, mouille avec le bouillon.",
      "Ajoute crème et jus de citron pour lier la sauce.",
      "Sers la blanquette avec du riz.",
    ],
    tip: "Un jaune d'œuf hors du feu rend la sauce encore plus onctueuse.",
  },
  "p-pot-au-feu": {
    steps: [
      "Place la viande de bœuf dans une grande marmite.",
      "Couvre d'eau froide, sale et porte à ébullition.",
      "Écume la surface puis ajoute carottes, poireaux et navets.",
      "Ajoute un oignon piqué de clous de girofle et un bouquet garni.",
      "Laisse mijoter 2 h à petit feu.",
      "Sers la viande et les légumes avec le bouillon.",
    ],
    tip: "Garde le bouillon pour une soupe de vermicelles le lendemain.",
  },
  "p-pizza": {
    steps: [
      "Préchauffe le four à 240°C.",
      "Étale une pâte à pizza sur une plaque.",
      "Nappe de sauce tomate jusqu'aux bords.",
      "Répartis la mozzarella et les garnitures de ton choix.",
      "Enfourne 12 min jusqu'à ce que la pâte soit dorée.",
    ],
    tip: "Un filet d'huile d'olive et du basilic frais à la sortie du four.",
  },
  "p-tacos": {
    steps: [
      "Coupe 2 filets de poulet en lamelles et fais-les cuire à la poêle.",
      "Assaisonne avec des épices mexicaines.",
      "Prépare des frites et une sauce fromagère.",
      "Garnis les galettes de poulet, frites et sauce.",
      "Referme les tacos et fais-les dorer 2 min à la poêle.",
    ],
    tip: "Presse bien le tacos fermé à la poêle pour qu'il tienne.",
  },
  "p-bolognaise": {
    steps: [
      "Fais revenir un oignon émincé dans l'huile.",
      "Ajoute 400 g de steak haché et fais-le dorer.",
      "Verse une boîte de tomates concassées et un peu de concentré.",
      "Assaisonne, ajoute des herbes et laisse mijoter 25 min.",
      "Fais cuire les spaghetti dans l'eau bouillante salée.",
      "Sers les pâtes nappées de sauce et de parmesan.",
    ],
    tip: "Une pincée de sucre corrige l'acidité de la tomate.",
  },
  "p-tartiflette": {
    steps: [
      "Préchauffe le four à 200°C.",
      "Fais cuire 1 kg de pommes de terre puis coupe-les en rondelles.",
      "Fais revenir lardons et oignons émincés à la poêle.",
      "Mélange pommes de terre, lardons et oignons dans un plat.",
      "Coupe un reblochon en deux et pose-le croûte vers le haut.",
      "Enfourne 25 min jusqu'à ce que le fromage soit fondu et doré.",
    ],
    tip: "Un peu de vin blanc déglacé dans la poêle parfume le plat.",
  },
  "p-poisson-pane": {
    steps: [
      "Prépare une purée de pommes de terre au beurre et au lait.",
      "Chauffe un peu d'huile dans une poêle.",
      "Fais dorer les poissons panés 3 min de chaque côté.",
      "Sers-les avec la purée et un quartier de citron.",
    ],
    tip: "Un peu de persil dans la purée la rend plus appétissante.",
  },
  "p-cordon-frites": {
    steps: [
      "Préchauffe le four à 220°C pour les frites.",
      "Enfourne les frites 20 min en les remuant à mi-cuisson.",
      "Chauffe un peu d'huile dans une poêle.",
      "Fais dorer les cordons bleus 4 min de chaque côté.",
      "Sers dès que le fromage commence à couler.",
    ],
    tip: "Cuisson à feu moyen pour que le cœur fonde sans brûler la panure.",
  },
  "p-omelette": {
    steps: [
      "Bats 6 œufs avec sel et poivre.",
      "Chauffe une poêle avec une noix de beurre.",
      "Verse les œufs et remue doucement les premières secondes.",
      "Laisse prendre puis plie l'omelette en deux.",
      "Sers avec une salade verte assaisonnée.",
    ],
    tip: "Retire l'omelette encore un peu baveuse, elle finit de cuire seule.",
  },
  "p-quiche-salade": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Étale une pâte brisée dans un moule et pique le fond.",
      "Bats 3 œufs avec 20 cl de crème, sel et poivre.",
      "Ajoute lardons ou légumes puis verse l'appareil sur la pâte.",
      "Enfourne 35 min jusqu'à ce que la quiche soit dorée.",
      "Sers avec une salade verte assaisonnée.",
    ],
    tip: "Une part de quiche tiède avec la salade, c'est le repas parfait.",
  },
  "p-chili": {
    steps: [
      "Fais revenir un oignon émincé dans l'huile.",
      "Ajoute 400 g de steak haché et fais-le dorer.",
      "Verse tomates concassées, haricots rouges et un peu de cumin.",
      "Assaisonne de piment selon le goût.",
      "Laisse mijoter 25 min à feu doux.",
      "Sers avec du riz blanc.",
    ],
    tip: "Un carré de chocolat noir dans le chili arrondit les saveurs.",
  },
  "p-risotto": {
    steps: [
      "Fais revenir un oignon émincé dans le beurre.",
      "Ajoute 300 g de riz arborio et nacre-le 1 min.",
      "Verse une louche de bouillon chaud en remuant.",
      "Continue d'ajouter du bouillon louche par louche pendant 18 min.",
      "Ajoute les champignons poêlés en cours de cuisson.",
      "Termine avec du parmesan et une noix de beurre.",
    ],
    tip: "Remue sans arrêt, c'est le secret d'un risotto crémeux.",
  },
  "p-nouilles-wok": {
    steps: [
      "Fais cuire les nouilles puis égoutte-les.",
      "Coupe le poulet en lamelles et fais-le saisir au wok.",
      "Ajoute des légumes coupés en lanières et fais sauter à feu vif.",
      "Ajoute les nouilles et de la sauce soja.",
      "Mélange bien 2 min à feu vif.",
    ],
    tip: "Prépare tous les ingrédients avant, le wok va très vite.",
  },
  "p-paella": {
    steps: [
      "Fais revenir poulet et chorizo dans une grande poêle.",
      "Ajoute oignon, poivron et ail émincés.",
      "Verse 300 g de riz et du safran, puis mélange.",
      "Couvre de bouillon chaud et laisse cuire 15 min sans remuer.",
      "Ajoute crevettes et moules sur le dessus.",
      "Poursuis la cuisson 10 min jusqu'à absorption du bouillon.",
    ],
    tip: "Ne remue plus le riz en fin de cuisson pour former le socarrat.",
  },
  "p-sushis": {
    steps: [
      "Rince le riz à sushi puis cuis-le selon le paquet.",
      "Assaisonne le riz tiède avec du vinaigre de riz sucré.",
      "Étale le riz sur une feuille d'algue nori.",
      "Dispose des lamelles de saumon et de concombre.",
      "Roule serré à l'aide d'un tapis puis coupe en tronçons.",
    ],
    tip: "Mouille ton couteau entre chaque coupe pour des tranches nettes.",
  },
  "p-hamburger": {
    steps: [
      "Enfourne ou fais frire les frites jusqu'à ce qu'elles dorent.",
      "Cuis les steaks hachés 3 min de chaque côté à la poêle.",
      "Fais griller les pains à burger côté mie.",
      "Monte le burger avec salade, tomate, steak, fromage et sauce.",
      "Sers aussitôt avec les frites.",
    ],
    tip: "Pose le fromage sur le steak en fin de cuisson pour le faire fondre.",
  },
  "p-burrito": {
    steps: [
      "Fais chauffer haricots rouges et riz avec des épices.",
      "Réchauffe les grandes tortillas quelques secondes à la poêle.",
      "Garnis chaque tortilla de riz, haricots et fromage.",
      "Ajoute de la salade et un peu de sauce.",
      "Replie les côtés puis roule serré.",
    ],
    tip: "Passe le burrito plié 1 min à la poêle pour le souder.",
  },
  "p-saucisses-puree": {
    steps: [
      "Prépare une purée de pommes de terre au beurre et au lait.",
      "Pique légèrement les saucisses.",
      "Fais-les cuire à la poêle 12 min en les retournant.",
      "Sers les saucisses bien dorées sur la purée.",
    ],
    tip: "Un peu de moutarde à côté, et les enfants adorent.",
  },
  "p-ratatouille": {
    steps: [
      "Coupe courgettes, aubergines, poivrons et tomates en dés.",
      "Fais revenir un oignon et de l'ail dans l'huile d'olive.",
      "Ajoute les légumes et des herbes de Provence.",
      "Laisse mijoter 40 min à feu doux en remuant de temps en temps.",
      "Sers la ratatouille avec du riz.",
    ],
    tip: "Cuis chaque légume à part pour une ratatouille encore meilleure.",
  },
  "p-moules-frites": {
    steps: [
      "Enfourne ou fais frire les frites.",
      "Rince et gratte les moules, jette celles qui restent ouvertes.",
      "Fais revenir échalote et ail dans du beurre.",
      "Ajoute les moules et un verre de vin blanc.",
      "Couvre et cuis 5 min jusqu'à ce que les moules s'ouvrent.",
      "Parsème de persil et sers avec les frites.",
    ],
    tip: "Jette les moules qui ne se sont pas ouvertes après cuisson.",
  },
  "p-gratin-pates": {
    steps: [
      "Préchauffe le four à 200°C.",
      "Fais cuire les pâtes al dente et égoutte-les.",
      "Prépare une béchamel avec beurre, farine et lait.",
      "Mélange les pâtes avec la béchamel et du jambon en dés.",
      "Verse dans un plat et parsème de fromage râpé.",
      "Enfourne 20 min jusqu'à ce que le dessus gratine.",
    ],
    tip: "Garde les pâtes un peu fermes, elles finissent de cuire au four.",
  },
  "p-raclette": {
    steps: [
      "Fais cuire les pommes de terre à l'eau ou à la vapeur.",
      "Dispose la charcuterie sur un plat.",
      "Allume l'appareil à raclette.",
      "Fais fondre les tranches de fromage dans les coupelles.",
      "Verse le fromage fondu sur les pommes de terre et la charcuterie.",
    ],
    tip: "Compte environ 200 g de fromage par personne.",
  },
  "p-croque": {
    steps: [
      "Préchauffe le four à 200°C ou allume l'appareil.",
      "Beurre les tranches de pain de mie.",
      "Garnis de jambon et de fromage.",
      "Referme les croques et ajoute un peu de fromage râpé dessus.",
      "Fais cuire 10 min jusqu'à ce qu'ils soient dorés.",
    ],
    tip: "Une fine couche de béchamel dedans, et c'est un vrai croque de bistrot.",
  },

  // Desserts
  "d-salade-fruits": {
    steps: [
      "Épluche et coupe pomme, banane, orange et kiwi en morceaux.",
      "Mets-les dans un saladier.",
      "Arrose d'un peu de jus d'orange et de citron.",
      "Ajoute une cuillère de sucre si besoin et mélange.",
      "Laisse reposer 30 min au frais avant de servir.",
    ],
    tip: "Le jus de citron empêche les fruits de noircir.",
  },
  "d-crepes": {
    steps: [
      "Mélange 250 g de farine avec 3 œufs.",
      "Ajoute 50 cl de lait petit à petit sans faire de grumeaux.",
      "Ajoute une pincée de sel et une cuillère de sucre.",
      "Laisse reposer la pâte 30 min.",
      "Cuis chaque crêpe 1 min de chaque côté dans une poêle chaude.",
    ],
    tip: "Une cuillère d'huile dans la pâte évite d'avoir à graisser la poêle.",
  },
  "d-mousse-choco": {
    steps: [
      "Fais fondre 200 g de chocolat au bain-marie.",
      "Sépare les blancs des jaunes de 6 œufs.",
      "Incorpore les jaunes au chocolat fondu tiède.",
      "Monte les blancs en neige ferme avec une pincée de sel.",
      "Incorpore délicatement les blancs au chocolat.",
      "Réserve au frais au moins 3 h avant de servir.",
    ],
    tip: "Mélange doucement de bas en haut pour garder la mousse aérienne.",
  },
  "d-yaourt": {
    steps: [
      "Sors le yaourt ou le fromage blanc du frigo.",
      "Verse-le dans des coupelles.",
      "Ajoute une cuillère de miel, de confiture ou de sucre.",
      "Parsème de fruits frais ou de céréales si tu veux.",
    ],
    tip: "Un filet de miel et quelques noix, et c'est un dessert complet.",
  },
  "d-tarte-pommes": {
    steps: [
      "Préchauffe le four à 180°C.",
      "Étale une pâte dans un moule et pique le fond.",
      "Épluche 4 pommes et coupe-les en fines lamelles.",
      "Dispose les lamelles en rosace sur la pâte.",
      "Saupoudre de sucre et ajoute quelques noisettes de beurre.",
      "Enfourne 35 min jusqu'à ce que les pommes soient dorées.",
    ],
    tip: "Étale un peu de compote sous les pommes pour plus de moelleux.",
  },
  "d-riz-au-lait": {
    steps: [
      "Fais chauffer 1 L de lait avec une gousse de vanille.",
      "Verse 150 g de riz rond et remue.",
      "Laisse cuire 30 min à feu doux en remuant souvent.",
      "Ajoute 80 g de sucre en fin de cuisson.",
      "Sers tiède ou bien frais.",
    ],
    tip: "Remue régulièrement pour que le riz n'attache pas au fond.",
  },
  "d-fraises": {
    steps: [
      "Lave et équeute 500 g de fraises.",
      "Coupe-les en deux ou en quatre.",
      "Saupoudre d'une ou deux cuillères de sucre.",
      "Mélange et laisse reposer 15 min avant de servir.",
    ],
    tip: "Un filet de jus de citron intensifie le goût des fraises.",
  },
  "d-fruits-rouges": {
    steps: [
      "Rince délicatement les fruits rouges.",
      "Égoutte-les avec soin.",
      "Répartis-les dans des coupelles.",
      "Saupoudre d'un peu de sucre si besoin.",
    ],
    tip: "Un peu de fromage blanc ou de chantilly les accompagne à merveille.",
  },
  "d-ananas": {
    steps: [
      "Coupe les deux extrémités de l'ananas.",
      "Retire l'écorce en tranchant du haut vers le bas.",
      "Enlève les yeux restants à la pointe du couteau.",
      "Coupe l'ananas en tranches et retire le cœur dur.",
    ],
    tip: "Un ananas mûr sent bon et une feuille centrale se détache facilement.",
  },
  "d-banane-choco": {
    steps: [
      "Fais fondre 100 g de chocolat au bain-marie.",
      "Coupe 2 bananes en rondelles.",
      "Répartis les bananes dans des coupelles.",
      "Nappe-les de chocolat fondu.",
    ],
    tip: "Quelques amandes effilées ajoutent du croquant.",
  },
  "d-crepe-choco": {
    steps: [
      "Prépare une pâte à crêpes et laisse-la reposer 30 min.",
      "Cuis chaque crêpe 1 min de chaque côté dans une poêle chaude.",
      "Étale de la pâte à tartiner sur la crêpe tiède.",
      "Plie la crêpe en quatre.",
    ],
    tip: "Une crêpe tiède fait fondre le chocolat, c'est bien meilleur.",
  },
  // --- Recettes des ajouts ---
  "e-veloute-tomate": {
    steps: [
      "Faire revenir l'oignon, ajouter les tomates et laisser mijoter 15 min.",
      "Mixer finement.",
      "Ajouter un filet de crème et servir chaud.",
    ],
    tip: "Un basilic frais dessus change tout.",
  },
  "e-veloute-champignons": {
    steps: [
      "Faire suer les champignons émincés.",
      "Couvrir d'eau, cuire 15 min puis mixer.",
      "Crémer et rectifier l'assaisonnement.",
    ],
  },
  "e-veloute-carottes": {
    steps: [
      "Éplucher et couper les carottes.",
      "Cuire dans un bouillon 20 min.",
      "Mixer avec un peu de crème.",
    ],
    tip: "Une pointe de cumin, c'est parfait.",
  },
  "e-soupe-poireaux": {
    steps: [
      "Émincer les poireaux, couper les pommes de terre.",
      "Couvrir d'eau et cuire 25 min.",
      "Mixer plus ou moins selon la texture voulue.",
    ],
  },
  "e-gaspacho": {
    steps: [
      "Couper tous les légumes.",
      "Mixer avec un filet d'huile d'olive et du vinaigre.",
      "Réserver au frais au moins 1 h avant de servir.",
    ],
    tip: "Se sert bien frais, l'été.",
  },
  "e-minestrone": {
    steps: [
      "Faire revenir les légumes en petits dés.",
      "Ajouter le bouillon et les haricots, cuire 20 min.",
      "Ajouter les petites pâtes en fin de cuisson.",
    ],
  },
  "e-soupe-poisson": {
    steps: [
      "Faire revenir les aromates.",
      "Ajouter le poisson et l'eau, mijoter 30 min.",
      "Mixer, passer au tamis et servir avec des croûtons.",
    ],
    tip: "La rouille et le gruyère râpé à côté.",
  },
  "e-salade-composee": {
    steps: [
      "Laver et couper la salade et les crudités.",
      "Dresser dans un saladier.",
      "Assaisonner d'une vinaigrette au moment de servir.",
    ],
  },
  "e-salade-pates": {
    steps: [
      "Cuire les pâtes, les rafraîchir à l'eau froide.",
      "Ajouter tomates, dés de légumes et olives.",
      "Lier avec un filet d'huile d'olive.",
    ],
  },
  "e-piemontaise": {
    steps: [
      "Cuire et couper les pommes de terre en dés.",
      "Ajouter jambon, œuf dur et cornichons.",
      "Lier à la mayonnaise et réserver au frais.",
    ],
  },
  "e-salade-lentilles": {
    steps: [
      "Cuire les lentilles 20 min puis les égoutter.",
      "Ajouter l'échalote ciselée.",
      "Assaisonner d'une vinaigrette à la moutarde.",
    ],
  },
  "e-chevre-chaud": {
    steps: [
      "Poser des rondelles de chèvre sur des toasts.",
      "Passer au four jusqu'à ce que le fromage dore.",
      "Poser sur la salade et arroser de miel.",
    ],
    tip: "Quelques noix, et c'est encore meilleur.",
  },
  "e-quiche-3fromages": {
    steps: [
      "Étaler la pâte dans un moule.",
      "Battre œufs, crème et fromages.",
      "Verser et cuire 35 min à 180°C.",
    ],
  },
  "e-tarte-oignon": {
    steps: [
      "Faire fondre les oignons émincés 20 min à feu doux.",
      "Les mélanger à l'appareil œufs-crème.",
      "Garnir la pâte et cuire 30 min.",
    ],
  },
  "p-moussaka": {
    steps: [
      "Faire dorer les tranches d'aubergine.",
      "Préparer la viande hachée à la tomate.",
      "Monter en couches, napper de béchamel et gratiner 30 min.",
    ],
  },
  "p-tajine-poulet": {
    steps: [
      "Faire dorer le poulet avec les épices.",
      "Ajouter légumes, olives et citron confit.",
      "Mijoter 40 min à couvert, servir avec la semoule.",
    ],
  },
  "p-cassoulet": {
    steps: [
      "Réchauffer les haricots avec la sauce tomate.",
      "Ajouter saucisse et confit.",
      "Enfourner 30 min pour gratiner le dessus.",
    ],
  },
  "p-choucroute": {
    steps: [
      "Rincer la choucroute et la faire cuire au vin blanc.",
      "Ajouter les viandes et saucisses.",
      "Cuire 1 h et servir avec les pommes de terre.",
    ],
  },
  "p-fondue-savoyarde": {
    steps: [
      "Frotter le caquelon à l'ail.",
      "Faire fondre les fromages avec le vin blanc.",
      "Tremper les morceaux de pain à la fourchette.",
    ],
  },
  "p-gratin-legumes": {
    steps: [
      "Couper les légumes en rondelles.",
      "Les ranger dans un plat, napper de crème.",
      "Parsemer de fromage et gratiner 35 min.",
    ],
  },
  "p-brandade": {
    steps: [
      "Cuire le poisson puis l'effeuiller.",
      "Écraser avec la purée de pommes de terre et l'ail.",
      "Mettre au plat et gratiner 20 min.",
    ],
  },
  "p-boulettes": {
    steps: [
      "Former des boulettes de viande.",
      "Les dorer puis mijoter dans la sauce tomate.",
      "Servir sur un lit de pâtes.",
    ],
  },
  "p-pad-thai": {
    steps: [
      "Faire tremper les nouilles de riz.",
      "Sauter crevettes, œuf et légumes au wok.",
      "Ajouter nouilles, sauce et cacahuètes concassées.",
    ],
  },
  "p-tomates-farcies": {
    steps: [
      "Évider les tomates.",
      "Les farcir de viande hachée assaisonnée.",
      "Enfourner 40 min et servir avec le riz.",
    ],
  },
  "p-kebab": {
    steps: [
      "Réchauffer la viande et le pain.",
      "Garnir de salade, tomate et sauce blanche.",
      "Servir avec les frites.",
    ],
  },
  "p-magret": {
    steps: [
      "Quadriller la peau et cuire côté gras d'abord.",
      "Terminer 4 min côté chair, laisser reposer.",
      "Trancher et servir avec les pommes de terre sautées.",
    ],
    tip: "Rosé à cœur, c'est le secret.",
  },
  "p-gigot": {
    steps: [
      "Piquer le gigot d'ail.",
      "Rôtir au four 1 h en arrosant.",
      "Laisser reposer et servir avec les flageolets.",
    ],
  },
  "p-travers-porc": {
    steps: [
      "Badigeonner les travers de sauce barbecue.",
      "Cuire au four 50 min en les retournant.",
      "Laquer une dernière fois et servir avec les frites.",
    ],
  },
  "p-entrecote": {
    steps: [
      "Sortir la viande à température ambiante.",
      "Saisir 3 min par face dans une poêle très chaude.",
      "Laisser reposer et servir avec les frites.",
    ],
  },
  "p-dorade-four": {
    steps: [
      "Inciser la dorade, glisser des rondelles de citron.",
      "Poser sur un lit de pommes de terre.",
      "Enfourner 25 min à 200°C.",
    ],
  },
  "p-saint-jacques": {
    steps: [
      "Sécher les noix de Saint-Jacques.",
      "Les snacker 1 min par face dans le beurre.",
      "Servir sur une purée bien lisse.",
    ],
    tip: "Surtout ne pas trop les cuire.",
  },
  "p-tofu-wok": {
    steps: [
      "Faire dorer les dés de tofu.",
      "Ajouter légumes et nouilles au wok.",
      "Déglacer à la sauce soja et servir.",
    ],
  },
  "p-dahl-lentilles": {
    steps: [
      "Faire revenir oignon et épices.",
      "Ajouter lentilles et lait de coco, mijoter 25 min.",
      "Servir avec le riz.",
    ],
  },
  "p-falafel": {
    steps: [
      "Réchauffer ou frire les falafels.",
      "Préparer la semoule et la salade.",
      "Servir avec une sauce blanche.",
    ],
  },
  "p-gnocchi-tomate": {
    steps: [
      "Cuire les gnocchi jusqu'à ce qu'ils remontent.",
      "Les mélanger à la sauce tomate chaude.",
      "Parsemer de parmesan.",
    ],
  },
  "p-endives-jambon": {
    steps: [
      "Braiser les endives puis les égoutter.",
      "Rouler chaque endive dans une tranche de jambon.",
      "Napper de béchamel et gratiner 20 min.",
    ],
  },
  "p-semoule-merguez": {
    steps: [
      "Griller les merguez.",
      "Préparer la semoule et les légumes.",
      "Dresser le tout ensemble.",
    ],
  },
  "p-polenta": {
    steps: [
      "Verser la polenta en pluie dans le lait bouillant.",
      "Remuer jusqu'à épaississement.",
      "Ajouter le parmesan et servir avec les champignons poêlés.",
    ],
  },
  "p-truite-amandes": {
    steps: [
      "Poêler la truite au beurre.",
      "Faire dorer les amandes effilées.",
      "Napper le poisson et servir avec le riz.",
    ],
  },
  "d-glace": {
    steps: [
      "Sortir la glace 5 min avant.",
      "Former de belles boules.",
      "Servir aussitôt.",
    ],
  },
  "d-creme-brulee": {
    steps: [
      "Préparer la crème aux jaunes d'œufs et la cuire au four au bain-marie.",
      "Laisser refroidir.",
      "Saupoudrer de sucre et caraméliser au chalumeau.",
    ],
  },
  "d-tiramisu": {
    steps: [
      "Monter le mascarpone avec les jaunes et le sucre.",
      "Tremper les biscuits dans le café.",
      "Alterner les couches et saupoudrer de cacao. Réserver 4 h au frais.",
    ],
  },
  "d-gateau-chocolat": {
    steps: [
      "Faire fondre le chocolat avec le beurre.",
      "Ajouter œufs, sucre et farine.",
      "Cuire 22 min à 180°C, garder le cœur fondant.",
    ],
  },
  "d-brownie": {
    steps: [
      "Fondre chocolat et beurre.",
      "Mélanger avec sucre, œufs, farine et noix.",
      "Cuire 25 min : le centre reste moelleux.",
    ],
  },
  "d-gaufres": {
    steps: [
      "Préparer la pâte à gaufres.",
      "Cuire dans le gaufrier bien chaud.",
      "Saupoudrer de sucre glace.",
    ],
  },
  "d-flan": {
    steps: [
      "Préparer l'appareil à flan et le faire épaissir.",
      "Verser sur un fond de pâte.",
      "Cuire 40 min et laisser refroidir.",
    ],
  },
  "d-clafoutis": {
    steps: [
      "Répartir les cerises dans un plat beurré.",
      "Verser l'appareil œufs-farine-lait.",
      "Cuire 35 min à 180°C.",
    ],
  },
  "d-salade-exotique": {
    steps: [
      "Éplucher et couper les fruits.",
      "Mélanger délicatement.",
      "Réserver au frais avant de servir.",
    ],
  },
  "d-poire-chocolat": {
    steps: [
      "Pocher les poires.",
      "Napper de chocolat fondu.",
      "Servir avec une boule de glace vanille.",
    ],
  },
  "d-yaourt-grec-miel": {
    steps: [
      "Verser le yaourt grec en coupe.",
      "Arroser de miel.",
      "Parsemer de noix concassées.",
    ],
  },
  "d-fromage-blanc-fruits": {
    steps: [
      "Déposer le fromage blanc en coupe.",
      "Ajouter les fruits rouges.",
      "Sucrer légèrement si besoin.",
    ],
  },
  // --- Recettes batch 2 ---
  "e-oeuf-mayo": {
    steps: [
      "Cuire les œufs durs 10 min.",
      "Les couper en deux.",
      "Napper de mayonnaise sur un lit de salade.",
    ],
  },
  "e-saucisson-beurre": {
    steps: [
      "Trancher le saucisson et la baguette.",
      "Beurrer le pain.",
      "Servir en apéritif.",
    ],
  },
  "e-radis-beurre": {
    steps: [
      "Laver et parer les radis.",
      "Servir avec du beurre et du sel.",
      "Accompagner de pain frais.",
    ],
  },
  "e-poireaux-vinaigrette": {
    steps: [
      "Cuire les poireaux à l'eau 20 min.",
      "Les égoutter et laisser tiédir.",
      "Napper de vinaigrette et parsemer d'œuf dur.",
    ],
  },
  "e-bruschetta": {
    steps: [
      "Toaster des tranches de pain.",
      "Ajouter tomates en dés et mozzarella.",
      "Filet d'huile d'olive et basilic.",
    ],
  },
  "e-houmous": {
    steps: [
      "Servir le houmous en bol.",
      "Arroser d'huile d'olive.",
      "Accompagner de pain pita tiède.",
    ],
  },
  "e-rillettes": {
    steps: [
      "Tartiner les rillettes sur du pain.",
      "Servir avec des cornichons.",
      "Poivrer légèrement.",
    ],
  },
  "e-pate-campagne": {
    steps: [
      "Trancher le pâté.",
      "Servir avec cornichons et pain.",
      "Une pointe de moutarde à côté.",
    ],
  },
  "e-crudites": {
    steps: [
      "Râper les carottes, couper concombre et tomates.",
      "Dresser par tas dans l'assiette.",
      "Servir avec une vinaigrette.",
    ],
  },
  "e-artichaut": {
    steps: [
      "Cuire les artichauts 35 min à l'eau bouillante.",
      "Laisser tiédir.",
      "Déguster feuille à feuille trempée dans la vinaigrette.",
    ],
  },
  "e-saumon-fume": {
    steps: [
      "Toaster le pain.",
      "Poser les tranches de saumon fumé.",
      "Un trait de citron et de l'aneth.",
    ],
  },
  "e-veloute-courgette": {
    steps: [
      "Cuire les courgettes dans un bouillon 15 min.",
      "Mixer finement.",
      "Crémer et servir.",
    ],
  },
  "p-coq-au-vin": {
    steps: [
      "Faire dorer le poulet avec lardons et oignons.",
      "Mouiller au vin rouge, ajouter les champignons.",
      "Mijoter 1 h à couvert.",
    ],
  },
  "p-poulet-basquaise": {
    steps: [
      "Faire dorer le poulet.",
      "Ajouter poivrons et tomates, mijoter 35 min.",
      "Servir avec le riz.",
    ],
  },
  "p-poulet-frites": {
    steps: [
      "Rôtir ou griller le poulet.",
      "Cuire les frites.",
      "Servir bien chaud.",
    ],
  },
  "p-poulet-haricots": {
    steps: [
      "Cuire le poulet.",
      "Faire sauter les haricots verts à l'ail.",
      "Dresser ensemble.",
    ],
  },
  "p-boeuf-bourguignon": {
    steps: [
      "Saisir la viande, ajouter oignons et carottes.",
      "Mouiller au vin rouge et mijoter 2 h.",
      "Ajouter les champignons en fin de cuisson.",
    ],
    tip: "Encore meilleur réchauffé le lendemain.",
  },
  "p-boeuf-carottes": {
    steps: [
      "Saisir le bœuf.",
      "Ajouter carottes en rondelles et bouillon.",
      "Mijoter 1 h 30 à feu doux.",
    ],
  },
  "p-cote-porc": {
    steps: [
      "Griller la côte de porc 6 min par face.",
      "Préparer une purée maison.",
      "Servir ensemble.",
    ],
  },
  "p-roti-porc": {
    steps: [
      "Assaisonner le rôti d'ail et d'herbes.",
      "Cuire au four 1 h en arrosant.",
      "Servir avec les pommes de terre rôties.",
    ],
  },
  "p-saucisse-lentilles": {
    steps: [
      "Cuire les lentilles avec un oignon 25 min.",
      "Faire dorer les saucisses.",
      "Servir les saucisses sur les lentilles.",
    ],
  },
  "p-merguez-frites": {
    steps: [
      "Griller les merguez.",
      "Cuire les frites.",
      "Servir avec de la moutarde.",
    ],
  },
  "p-boudin-puree": {
    steps: [
      "Poêler le boudin doucement.",
      "Faire revenir des pommes en quartiers.",
      "Servir sur la purée.",
    ],
  },
  "p-jambon-coquillettes": {
    steps: [
      "Cuire les coquillettes.",
      "Ajouter le jambon en dés.",
      "Parsemer de fromage râpé.",
    ],
    tip: "Le plat préféré des enfants.",
  },
  "p-carbonara": {
    steps: [
      "Cuire les pâtes.",
      "Faire dorer les lardons.",
      "Hors du feu, lier avec jaunes d'œufs et parmesan.",
    ],
    tip: "La vraie carbo n'a pas de crème.",
  },
  "p-pates-pesto": {
    steps: [
      "Cuire les pâtes al dente.",
      "Mélanger au pesto hors du feu.",
      "Parsemer de parmesan.",
    ],
  },
  "p-pates-saumon": {
    steps: [
      "Cuire les pâtes.",
      "Faire une sauce crème et saumon.",
      "Mélanger et servir.",
    ],
  },
  "p-riz-cantonais": {
    steps: [
      "Cuire le riz et le laisser refroidir.",
      "Faire une omelette en lamelles.",
      "Sauter le riz au wok avec jambon, petits pois et œuf.",
    ],
  },
  "p-poke-bowl": {
    steps: [
      "Cuire le riz et le laisser tiédir.",
      "Couper saumon et avocat en dés.",
      "Dresser en bol et arroser de sauce soja.",
    ],
  },
  "p-tortilla": {
    steps: [
      "Faire revenir pommes de terre et oignons.",
      "Battre les œufs et verser dessus.",
      "Cuire des deux côtés à la poêle.",
    ],
  },
  "p-shakshuka": {
    steps: [
      "Faire mijoter tomates et poivrons épicés.",
      "Casser les œufs dans la sauce.",
      "Couvrir jusqu'à ce que les œufs prennent.",
    ],
  },
  "p-quenelles-nantua": {
    steps: [
      "Poser les quenelles dans un plat.",
      "Napper de sauce Nantua.",
      "Cuire au four 25 min, servir avec le riz.",
    ],
  },
  "p-sole-meuniere": {
    steps: [
      "Fariner la sole.",
      "La cuire au beurre 3 min par face.",
      "Arroser de beurre citronné, servir avec les pommes vapeur.",
    ],
  },
  "p-cabillaud-riz": {
    steps: [
      "Cuire le dos de cabillaud à la vapeur ou au four.",
      "Préparer le riz.",
      "Servir avec un trait de citron.",
    ],
  },
  "p-brochettes-riz": {
    steps: [
      "Griller les brochettes.",
      "Cuire le riz.",
      "Servir avec des poivrons poêlés.",
    ],
  },
  "p-paupiettes": {
    steps: [
      "Faire dorer les paupiettes.",
      "Mijoter avec champignons et sauce 35 min.",
      "Servir avec le riz.",
    ],
  },
  "p-croque-madame": {
    steps: [
      "Monter le croque jambon-fromage.",
      "Dorer au four.",
      "Poser un œuf au plat dessus.",
    ],
  },
  "p-gratin-chou-fleur": {
    steps: [
      "Cuire le chou-fleur 15 min.",
      "Le napper de béchamel.",
      "Parsemer de fromage et gratiner 25 min.",
    ],
  },
  "p-steak-hache-puree": {
    steps: [
      "Cuire le steak haché à la poêle.",
      "Préparer une purée maison.",
      "Servir ensemble.",
    ],
    tip: "La valeur sûre des enfants.",
  },
  "p-nuggets-frites": {
    steps: [
      "Cuire les nuggets au four.",
      "Cuire les frites.",
      "Servir avec du ketchup.",
    ],
  },
  "p-aligot-saucisse": {
    steps: [
      "Préparer une purée bien lisse.",
      "Incorporer la tomme jusqu'à ce que ça file.",
      "Servir avec une saucisse grillée.",
    ],
  },
  "p-welsh": {
    steps: [
      "Faire fondre le cheddar à la bière.",
      "Verser sur une tranche de pain et de jambon.",
      "Gratiner au four et servir bien chaud.",
    ],
  },
  "p-chou-farci": {
    steps: [
      "Blanchir les feuilles de chou.",
      "Les farcir de viande et de riz.",
      "Cuire au four en sauce tomate 40 min.",
    ],
  },
  "d-pain-perdu": {
    steps: [
      "Tremper le pain dans un mélange œuf-lait-sucre.",
      "Le dorer à la poêle au beurre.",
      "Saupoudrer de sucre et servir tiède.",
    ],
  },
  "d-crumble": {
    steps: [
      "Couper les pommes en dés dans un plat.",
      "Sabler farine, beurre et sucre.",
      "Répartir la pâte et cuire 30 min.",
    ],
  },
  "d-tarte-citron": {
    steps: [
      "Cuire le fond de tarte à blanc.",
      "Préparer la crème au citron.",
      "Garnir et laisser prendre au frais.",
    ],
  },
  "d-tarte-tatin": {
    steps: [
      "Caraméliser les pommes dans le moule.",
      "Couvrir de pâte.",
      "Cuire 30 min et retourner à la sortie du four.",
    ],
  },
  "d-ile-flottante": {
    steps: [
      "Monter les blancs et les pocher.",
      "Préparer une crème anglaise aux jaunes.",
      "Poser les blancs sur la crème et napper de caramel.",
    ],
  },
  "d-panna-cotta": {
    steps: [
      "Chauffer crème, sucre et gélatine.",
      "Verser en verrines et laisser prendre 4 h.",
      "Napper d'un coulis de fruits rouges.",
    ],
  },
  "d-banana-split": {
    steps: [
      "Couper la banane en deux.",
      "Poser des boules de glace.",
      "Napper de chocolat fondu.",
    ],
  },
  "d-compote": {
    steps: [
      "Éplucher et couper les pommes.",
      "Cuire à couvert 20 min avec un peu d'eau.",
      "Écraser et servir tiède ou froid.",
    ],
  },
  "d-fondant-chocolat": {
    steps: [
      "Fondre chocolat et beurre.",
      "Ajouter œufs, sucre et un peu de farine.",
      "Cuire 10 min : le cœur reste coulant.",
    ],
  },
  "d-riz-au-lait-caramel": {
    steps: [
      "Cuire le riz dans le lait sucré 35 min.",
      "Remuer souvent.",
      "Servir avec un filet de caramel.",
    ],
  },
  "d-petit-suisse-confiture": {
    steps: [
      "Démouler les petits-suisses.",
      "Ajouter une cuillère de confiture.",
      "Servir bien frais.",
    ],
  },
  "d-yaourt-fruits": {
    steps: [
      "Verser le yaourt en coupe.",
      "Ajouter des fruits frais.",
      "Servir aussitôt.",
    ],
  },
};

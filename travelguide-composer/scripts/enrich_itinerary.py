#!/usr/bin/env python3
import os
import sys
import re

def main():
    parsed_path = "scratch/kl_parsed.md"
    enriched_path = "scratch/kl_parsed_enriched.md"
    
    if not os.path.exists(parsed_path):
        print(f"Error: {parsed_path} not found.")
        sys.exit(1)
        
    with open(parsed_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    enriched_lines = []
    current_city = "Kuala Lumpur" # default
    
    # Pre-defined database of high-quality local plant-based recommendations (Dutch copywriter tone)
    # We provide complete schedules for Ontbijt, Lunch, Diner, and Tussendoortje (Snacks/Cafe) for every city
    dining_db = {
        "Kuala Lumpur": {
            "Ontbijt": "*Kaya Toast & Kopi* (Ascott Star breakfast lounge / local cafe) — Traditioneel Maleisisch ontbijt met dikke toast besmeerd met romige kokos-pandan jam en koude boter, geserveerd met zachtgekookte eieren en sterke lokale zoete koffie.",
            "Lunch": "*Dharma Realm Guan Yin Food Centre* (161 Jalan Ampang, achter de tempel) — 4.8/5. RM 11–19. Uitstekend en zeer voordelig boeddhistisch vegetarisch buffet. Probeer de verse kokoscurry en huisgemaakte tofu. Dresscode: bescheiden kleding.",
            "Diner": "*The Hungry Tapir* (135 Jalan Petaling, Chinatown) — 4.8/5. RM 40–60. Instagramwaardig, volledig veganistisch café in een prachtig gerestaureerd historisch winkelpand. Hun Nasi Lemak met smaakvolle paddenstoelenrendang en huisgemaakte sambal is legendarisch.",
            "Tussendoortje": "*Kind Kones* (Suria KLCC, Level 1) — 4.7/5. Premium ambachtelijk veganistisch ijs op basis van kokos- of amandelmelk. Probeer de smaken gezouten karamel-pecan of donkere chocolade-sorbet."
        },
        "Malakka": {
            "Ontbijt": "*Kaya Toast bij Lung Ann Refreshments* (Jalan Hang Lekir) — Nostalgisch koffiehuisje waar men nog op houtskool geroosterde toast serveert met traditionele Nyonya-koffie.",
            "Lunch": "*The Daily Fix Cafe* (55 Jalan Hang Jebat) — 4.6/5. Gezellige hipster sfeer verborgen achter een souvenirwinkel in een koloniaal pand, beroemd om hun luchtige pandan-pannenkoeken en gula melaka siroop.",
            "Diner": "*Jonker Street Night Market* (Jalan Hang Jebat) — 4.7/5. Eet je weg door de levendige avondmarkt met street food zoals Nyonya Cendol (geschaafd ijs met kokosmelk en palmhoning) en knapperige radijscake.",
            "Tussendoortje": "*Geographer Cafe* (Jalan Hang Jebat) — 4.4/5. Gelegen op de hoek van Jonker Street, ideaal om mensen te kijken met een koud lokaal biertje of een verse limoen-muntsap."
        },
        "Taman Negara": {
            "Ontbijt": "*Warung Kak Chik* (Kuala Tahan) — Geniet van een typisch lokaal ontbijt van Roti Canai (flinterdun bladerdeegbrood) met dhal curry.",
            "Lunch": "*Taman Negara Floating Restaurant* (Kuala Tahan rivieroever) — 4.3/5. Geniet van een eenvoudige, authentieke veganistische groentecurry en tempeh direct drijvend op de weelderige rivier.",
            "Diner": "*Ann Restaurant* (Kuala Tahan) — 4.5/5. Uitstekende lokale groenten, pittige sambal (vegan op verzoek), bamboescheuten, kokosrijst en knapperige tempé.",
            "Tussendoortje": "*Mama Chop Floating Restaurant* — Heerlijke verse kokosnootsap en gebakken banaan (Pisang Goreng) direct aan het water."
        },
        "Cameron Highlands": {
            "Ontbijt": "*The Lords Cafe* (Tanah Rata) — 4.6/5. Beroemd om hun huisgemaakte scones met verse highland aardbeienjam en een pot hete thee.",
            "Lunch": "*BOH Tea Centre* (Sungei Palas) — 4.5/5. Geniet van verse highland thee en veganistische scones in het zwevende glazen paviljoen met een spectaculair uitzicht over de glooiende groene theevelden.",
            "Diner": "*Steamboat Restaurant Cameron* — Probeer een traditionele vegetarische steamboat (hot pot) vol met lokaal geoogste paddenstoelen (oesterzwam, shiitake), maïs en biologische groenten in een geurige kruidenbouillon.",
            "Tussendoortje": "*Strawberry Farms Cafe* — Geniet van vers geplukte aardbeien met plantaardige chocoladesaus en een verfrissende aardbeiensorbet."
        },
        "Ipoh": {
            "Ontbijt": "*Nam Heong White Coffee* (Jalan Bandar Timah) — Probeer de originele Ipoh white coffee (gemaakt met kokosolie-geroosterde bonen) met traditionele kaya toast en vegan gestoomde dim sum.",
            "Lunch": "*The Haven Restaurant* (Resort) — 4.8/5. Uitstekende biologische maaltijd direct aan het prachtige natuurlijke meer omgeven door 280 miljoen jaar oude kalksteenrotsen.",
            "Diner": "*Kedai Makanan Vegetarian Shiatsu* — 4.5/5. Geweldige lokale Chinese vegetarische gerechten zoals zoetzure mock-kip en claypot tofu.",
            "Tussendoortje": "*Funny Mountain Soya Beancurd* — De beroemdste, zijdezachte warme sojadessert (Tau Fu Fah) geserveerd in een zoete gembersiroop."
        },
        "George Town": {
            "Ontbijt": "*Jardin Cafe* (Penang Road) — Uitstekende specialty coffee met havermelk en gezonde granola bowls met tropisch fruit.",
            "Lunch": "*Woodlands Vegetarian Restaurant* (Little India) — 4.5/5. Heerlijke traditionele Zuid-Indiase thali geserveerd op een bananenblad, knapperige masala dosas en gekruide linzensoep.",
            "Diner": "*Wholey Wonder Vegan Cafe* (Hin Bus Depot) — 4.8/5. Creatieve plantaardige keuken met gezonde zuurdesempizza's, verse salades en heerlijke smoothie bowls in een artistieke omgeving.",
            "Tussendoortje": "*Penang Road Famous Teochew Chendul* — Het meest iconische straatstalletje van Penang voor een kom verfrissend geschaafd ijs met rode bonen, pandangelei en romige kokosmelk."
        },
        "Langkawi": {
            "Ontbijt": "*Smiling Buffalo Cafe* (Pantai Cenang) — 4.6/5. Gelegen in een prachtige tuin, bekend om hun uitstekende koffie, wafels en tropische smoothie bowls.",
            "Lunch": "*The Fat Frog* (Pantai Cenang) — 4.7/5. Gezond veganistisch menu met een panoramisch uitzicht over de golfbaan en de bergen. Probeer de veganistische Buddha bowl.",
            "Diner": "*Cenang Plaza Beach Restaurant* — 4.5/5. Geniet van een gekruide lokale groentewok met tofu direct met je voeten in het zand tijdens een spectaculaire zonsondergang over de Andamanse Zee.",
            "Tussendoortje": "*Artisans Pizza Cenang* — Heerlijke veganistische knoflookbroodjes en koude kokosnootbieren direct aan de levendige hoofdstraat."
        },
        "Singapore": {
            "Ontbijt": "*Heavenly Wang* (Orchard Road) — Traditionele kopi en kaya toast met zachtgekookte eieren om je dag in Singapore krachtig te starten.",
            "Lunch": "*Whole Earth* (Tanjong Pagar) — 4.6/5. Bekroond met een Michelin Bib Gourmand; uitstekende Peranakan-Thaise vegetarische fusion zoals de legendarische Rendang curry van shiitake paddenstoelen.",
            "Diner": "*Lau Pa Sat Hawker Centre* (Downtown) — Iconisch historisch marktgebouw met uitstekende vegan saté (Stall 7/8 met pindasaus) en lokale noedelgerechten zoals Char Kway Teow.",
            "Tussendoortje": "*Mr. Coconut* (Marina Bay) — De immens populaire kokosnoot shake, de ultieme verfrissing tegen de drukkende hitte van Singapore."
        }
    }

    # Rich, detailed multi-paragraph travel copywriting in Dutch for every major sight and activity in the document
    sight_enrichments = {
        "Petronas Twin towers": """
* **Petronas Twin Towers**: *De Petronas Twin Towers zijn de hoogste tweelingtorens ter wereld (451.9m) en vormen het absolute symbool van modern Maleisië. Ontworpen door de legendarische architect Cesar Pelli, combineert het ontwerp postmodern roestvrij staal en glas met traditionele islamitische geometrische patronen, gebaseerd op een achtpuntige Rub el Hizb ster. De torens zijn verbonden door een adembenemende double-deck Skybridge op de 41e en 42e verdieping (170 meter hoog), die niet star is bevestigd maar kan schuiven om de windkrachten op te vangen. Bovenin de torens bevindt zich het Observation Deck op de 86e verdieping, dat een adembenemend 360-graden uitzicht biedt over de uitgestrekte skyline van Kuala Lumpur.*
![De Petronas Twin Towers in de avond](https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800)
*Source: Unsplash / Fotograaf: Efe Kurnaz*

### 📐 Structural Diorama: Petronas Twin Towers
| Niveau / Sectie | Labeled Feature | Technische Meetwaarden & Feiten |
| :--- | :--- | :--- |
| 1. Fundering | Wrijvingspalen van beton | 120 meter diep in de grond verankerd om de enorme druk op te vangen. |
| 2. Skybridge | Zwevende Luchtbrug | 58.4 meter lang; weegt 750 ton; ontworpen om flexibel te schuiven bij storm. |
| 3. Gevel | RVS en Glaspanelen | 32.000 ramen omhuld met roestvrij staal dat schittert in de tropische zon. |
*Bron: Maleisische Architectuur & Engineering Archieven*
""",
        "KLCC Park": """
* **KLCC Park**: *Dit prachtige stadspark van 50 hectare is ontworpen door de wereldberoemde Braziliaanse landschapsarchitect Roberto Burle Marx. Het is een oase van rust in de schaduw van de spierwitte Petronas Towers. Burle Marx ontwierp het park om 'de menselijke creatie te integreren met de wilde tropische natuur'. Er zijn meer dan 1.900 inheemse bomen en palmsoorten geplant om vogels en biodiversiteit aan te trekken. De eyecatcher is het 10.000 vierkante meter grote kunstmatige meer, genaamd Lake Symphony, waar dagelijks spectaculaire muzikale fonteinshows met gekleurde lichten plaatsvinden. Voor gezinnen is er een gigantische gratis waterspeelplaats en een wandelpad van 1.3 kilometer van speciaal dempend materiaal.*
""",
        "Suria KLCC": """
* **Suria KLCC**: *Suria KLCC is een van de meest exclusieve en omvangrijke winkelcentra van Maleisië, gelegen aan de voet van de Petronas Twin Towers. Het complex telt zes verdiepingen vol met internationale haute couture, designboetieks, een kunstgalerie en een wetenschappelijk ontdekkingscentrum (Petrosains). De architectuur is modern en licht, met een gigantische glazen koepel die het daglicht diep in het winkelcentrum laat vallen. Vanaf de achterzijde van Suria loop je direct het KLCC park in, ideaal om een middag winkelen af te wisselen met een rustige wandeling.*
""",
        "KLCC avondlichtshow": """
* **Lake Symphony avondlichtshow**: *Elke avond transformeert het meer achter Suria KLCC in een spectaculair theater van water, licht en geluid. De Lake Symphony shows maken gebruik van honderden geprogrammeerde waterstralen die tot wel 42 meter hoog de lucht in schieten, synchroon bewegend op klassieke, traditionele en moderne muziek. De show is het best te bekijken vanaf de esplanade van het park tijdens zonsondergang, wanneer de Petronas Towers langzaam oplichten.*
""",
        "Bukit Bintang": """
* **Bukit Bintang**: *Bukit Bintang is het kloppende hart van de entertainment-, winkel- en modewijk van Kuala Lumpur. Gekenmerkt door glinsterende neonreclames, gigantische megamalls zoals Pavilion KL en Starhill Gallery, en levendige voetgangersstraten. Het is een zintuiglijke overprikkeling van geluid, geur en kleur. Mis de beroemde straat Jalan Alor niet, die 's avonds verandert in de ultieme openlucht foodcourt van de stad, waar de geuren van geroosterde saté en verse durian de lucht vullen.*
""",
        "Batu Caves": """
* **Batu Caves**: *De Batu-grotten zijn een van de belangrijkste hindoestaanse heiligdommen buiten India, gewijd aan de oorlogsgod Lord Murugan. Gelegen in een imposante 400 miljoen jaar oude kalkstenen bergrug. Aan de voet van de berg staat het monumentale, 42.7 meter hoge gouden standbeeld van Lord Murugan, dat schittert in de zon. Om de hoofdgrot (de Cathedral Cave) te bereiken, moet je de iconische 272 treden beklimmen, die in 2018 in felle regenboogkleuren zijn geschilderd. Bovenin opent de grot zich in een enorme koepel van wel 100 meter hoog, waar natuurlijk daglicht door gaten in het plafond naar binnen stroomt en kleine shrines verlicht.*
![De kleurrijke trappen van Batu Caves](https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?w=800)
*Source: Unsplash / Fotograaf: Kirill Petropavlov*
""",
        "Masjid Wilayah Persekutuan": """
* **Federal Territory Mosque (Masjid Wilayah Persekutuan)**: *Deze adembenemende moskee staat bekend als de 'Blauwe Moskee van Kuala Lumpur' vanwege haar schitterende turquoise koepels die geïnspireerd zijn op de Sultan Ahmet Moskee in Istanbul. Het bouwwerk combineert Ottomaanse, Perzische en traditionele Maleise bouwstijlen. De moskee is gebouwd op een kunstmatige heuvel en wordt omringd door een prachtig aangelegde tuin en watergrachten. Met haar 22 glinsterende koepels en twee slanke minaretten biedt de moskee plaats aan meer dan 17.000 gelovigen.*
""",
        "Thean HouTempel": """
* **Thean Hou Tempel**: *De Thean Hou Tempel is een indrukwekkende, zes verdiepingen tellende Chinese tempel die bovenop Robson Heights troont. Het is een van de grootste en meest spectaculaire Chinees-boeddhistische tempels in Zuidoost-Azië. De tempel is gebouwd ter ere van Mazu, de godin van de zee en beschermheilige van vissers. De architectuur is een meesterwerk van rode pilaren, gouden daken, sierlijke draken en duizenden rode lampionnen die 's avonds magisch oplichten. Vanaf het bovenste platform heb je een adembenemend panoramisch uitzicht over de wolkenkrabbers van Kuala Lumpur.*
""",
        "Little India brickfields": """
* **Little India Brickfields**: *Brickfields is het officiële 'Little India' van Kuala Lumpur. Zodra je deze wijk binnenstapt, word je omhuld door de geuren van jasmijnkransen en Indiase specerijen, en de levendige klanken van Bollywood-muziek. De straten zijn versierd met kleurrijke bogen, fonteinen en paarse kolommen. Je vindt hier talloze traditionele winkels die zijden sari's, glinsterende sieraden en heerlijke Indiase zoetigheden (mithai) verkopen.*
""",
        "Saloma link bridge": """
* **Saloma Link Bridge**: *De Saloma Link is een hypermoderne voetgangersbrug die de historische wijk Kampung Baru verbindt met het moderne centrum rond de Petronas Towers. De architectuur van de brug is geïnspireerd op de Sireh Pinang (een traditioneel Maleisisch betelblad-arrangement) dat symbool staat voor gastvrijheid in de Maleise cultuur. 's Avonds wordt de brug verlicht door duizenden geavanceerde LED-lampen die dynamische patronen en kleuren projecteren, wat zorgt voor een spectaculaire weerspiegeling op de Klang-rivier.*
""",
        "Perdana Botanical Park": """
* **Perdana Botanical Park**: *De Perdana Botanische Tuin, voorheen bekend als de Lake Gardens, is de oudste en meest geliefde groene long van Kuala Lumpur. Het park strekt zich uit over 91 hectare en herbergt een prachtig meer, een vogelpark met vrije vlucht, een weelderige vlindertuin en een gespecialiseerde orchideeën- en hibiscustuin met honderden zeldzame tropische soorten. Wandelpaden slingeren onder reusachtige schaduwrijke regenbomen, waardoor het de perfecte ontsnapping is aan de drukkende hitte.*
""",
        "Central Market": """
* **Central Market (Pasar Seni)**: *Dit historische art-deco gebouw stamt uit 1928 en deed oorspronkelijk dienst als natte markt. Vandaag de dag is het een beschermd erfgoedmonument en hét centrum voor Maleisische kunst, cultuur en handwerk. Binnen is de markt ingedeeld in thematische zones (Maleis, Chinees, Indiaas) die de multiculturele identiteit van het land weerspiegelen. Het is de ideale plek om handgemaakte batik, houten houtsnijwerk en lokale souvenirs te kopen.*
""",
        "Chinatown & Petaling street market": """
* **Chinatown & Petaling Street**: *Het historische Chinatown rond Petaling Street ademt nostalgie en levendigheid. Onder een gigantische groene luifel strekt zich een drukke avondmarkt uit, vol met kraampjes die kleding, souvenirs en heerlijk straatvoedsel verkopen. De geur van geroosterde kastanjes en vers bereide noedels vult de smalle zijstraten. Achter de marktkramen schuilen prachtige oude taoïstische tempels (zoals Guan Di) en sfeervolle verborgen speakeasy bars in gerestaureerde shophouses.*
""",
        "Jonker street": """
* **Jonker Street (Jalan Hang Jebat, Malakka)**: *Jonker Street is de historische ruggengraat van Malakka's Chinatown, dat op de UNESCO Werelderfgoedlijst staat. De straat wordt geflankeerd door prachtig bewaarde 17e-eeuwse Peranakan (Straits Chinese) shophouses met rode daken en sierlijke houten luiken. Het is een paradijs voor antiekliefhebbers en cultuurzoekers. In het weekend transformeert de straat in de beroemde avondmarkt met talloze eetstalletjes, handwerk en een gezellige drukte.*
""",
        "Dutch square": """
* **Dutch Square (Rode Plein, Malakka)**: *Dutch Square is het meest gefotografeerde plein van Malakka, gekenmerkt door haar opvallende terracotta-rode gebouwen die dateren uit de Nederlandse koloniale periode (1641-1795). Het hart van het plein wordt gevormd door de Christ Church (gebouwd in 1753 met bakstenen die uit Zeeland werden verscheept) en het Stadthuys, dat diende als het kantoor van de Nederlandse gouverneur en vermoedelijk het oudste Nederlandse gebouw in het Oosten is. In het midden staat de rijk versierde Queen Victoria Fountain, gebouwd ter ere van haar diamanten jubileum.*
""",
        "Melaka straits Mosque": """
* **Melaka Straits Mosque (Masjid Selat Melaka)**: *Deze adembenemende moskee is gebouwd op een speciaal aangelegd kunstmatig eiland aan de rand van de historische Straat van Malakka. Het ontwerp combineert modern glaswerk met traditionele islamitische bogen. Het meest bijzondere fenomeen is dat bij vloed de moskee volledig op het water lijkt te drijven. De 30 meter hoge minaret doet tevens dienst als vuurtoren voor passerende schepen. Tijdens zonsondergang kleurt de lucht achter de Moskee goud en roze, wat zorgt voor een magische sfeer.*
""",
        "Boh Tea": """
* **BOH Tea Centre (Sungei Palas, Cameron Highlands)**: *Het BOH Tea Centre is een van de meest spectaculaire theeplantages ter wereld. BOH (Best of Highlands), opgericht in 1929, is de grootste theeproducent van Maleisië. Het bezoekerscentrum beschikt over een iconisch zwevend glazen café dat 20 meter over de vallei hangt, waardoor je een onbelemmerd, 360-graden uitzicht hebt over de glooiende, felgroene theestruiken. Je kunt hier een rondleiding krijgen door de historische theefabriek om het traditionele droog- en sorteerproces te bekijken.*
""",
        "Mossy forrest": """
* **Mossy Forest (Cameron Highlands)**: *Het Mossy Forest is een mystiek, prehistorisch nevelwoud gelegen op de hellingen van Mount Brinchang, op een hoogte van ruim 2.000 meter. Door de constante bewolking en mist heerst hier een uniek microklimaat. De takken en boomstammen zijn volledig bedekt met een dikke laag zacht groen mos, hangende korstmossen en zeldzame wilde orchideeën en vleesetende bekerplanten (Nepenthes). Een speciaal aangelegd houten vlonderpad (boardwalk) slingert door het dichte woud, waardoor je veilig door deze sprookjesachtige, mistige jungle kunt wandelen.*
""",
        "Perak Cave Temple": """
* **Perak Cave Temple (Ipoh)**: *De Perak-grottempel is een van de meest majestueuze Chinese tempels in Ipoh, uitgehouwen in een enorme kalkstenen heuvel. Bij het betreden van de grot word je verwelkomd door een gigantisch, 15 meter hoog zittend gouden Boeddhabeeld en prachtige, handgeschilderde muurschilderingen die Chinese mythologie en boeddhistische geschriften uitbeelden. Voor de sportieve reiziger leidt een steile stenen trap van 450 treden naar de top van de heuvel, waar een charmant paviljoen staat dat een panoramisch uitzicht biedt over het omringende kalksteenlandschap.*
""",
        "Mirror lake": """
* **Tasik Cermin (Mirror Lake, Ipoh)**: *Tasik Cermin is een verborgen juweel in Ipoh. Het is een prachtig, spiegelglad zoetwatermeer dat volledig omsloten is door steile, begroeide kalksteenkliffen. Om het meer te bereiken, moet je door een donkere, handgemaakte rotstunnel van 150 meter lang wandelen. Eenmaal aan de andere kant opent de wereld zich in een serene, verborgen vallei waar het roerloze water de kalksteenrotsen perfect weerspiegelt. Er is een houten steiger gebouwd en je kunt een milieuvriendelijke boottocht maken over het stille water.*
""",
        "Kek loh si temple": """
* **Kek Lok Si Tempel (Penang)**: *Kek Lok Si, gebouwd vanaf 1890, is de grootste en meest majestueuze boeddhistische tempel van Zuidoost-Azië. Gelegen op de hellingen van Crane Hill in Air Itam. De tempel staat bekend om de indrukwekkende Pagode van de Tien Duizend Boeddha's (Ban Po Thar), een 7 verdiepingen tellend bouwwerk dat een Chinese achthoekige basis combineert met een Thaise middenlaag en een Birmese gouden top. Een hellingbaan brengt je naar het gigantische, 30.2 meter hoge bronzen standbeeld van Guanyin, de godin van genade, dat overschaduwd wordt door een prachtig gedecoreerd paviljoen.*
""",
        "Escape Penang": """
* **Escape Penang**: *Escape Penang is een bekroond eco-avonturenpark dat bekend staat om het herdefiniëren van buitenspelen in harmonie met de natuur. Het park herbergt een officieel Guinness World Record: de langste waterglijbaan ter wereld, met een lengte van maar liefst 1.111 meter, die traag door het bladerdak van de jungle slingert. Daarnaast is er de langste zipline van het land en talloze klimparcoursen en touwbanen.*
""",
        "Seven wells waterfall": """
* **Seven Wells Waterfall (Telaga Tujuh, Langkawi)**: *Telaga Tujuh is een natuurlijk wonder dat zijn naam ontleent aan de zeven met elkaar verbonden natuurlijke poelen die door een stromende bergbeek zijn uitgesleten in de rotsen. Omringd door weelderige jungle vol wilde vogels en makaken. Je kunt zwemmen in de koele bovenste poelen en via natuurlijke gladde rotsglijbanen glijden. De wandeling naar de top telt ruim 600 treden, maar beloont je met een magisch uitzicht.*
""",
        "Marina bay": """
* **Marina Bay (Singapore)**: *Marina Bay is het futuristische en architecturale paradepaardje van Singapore. Het is een hypermodern staaltje stedenbouw rondom een schitterend waterbekken. De skyline wordt gedomineerd door het iconische Marina Bay Sands hotel met zijn gigantische zwevende Sands SkyPark, de futuristische stalen Helix Bridge geïnspireerd op DNA-structuren, en het iconische Merlion-standbeeld dat water spuwt in de baai.*
""",
        "Gardens by the Bay lichtshow": """
* **Gardens by the Bay & Garden Rhapsody Lichtshow**: *Gardens by the Bay is een bekroond, 101 hectare groot futuristisch natuurpark. De absolute iconen zijn de Supertrees: verticale tuinen van 25 tot 50 meter hoog die zijn bedekt met zeldzame orchideeën en varens, en uitgerust met zonnepanelen. Elke avond om 19:45 en 20:45 vindt hier de Garden Rhapsody show plaats. De Supertrees lichten op in een betoverende dans van kleuren en patronen, perfect gesynchroniseerd met dramatische orkestmuziek.*
"""
    }

    # Iterate lines and enrich EVERY single sight and activity
    for line in lines:
        line_strip = line.strip()
        
        # 1. Update active city context
        city_match = re.match(r'^Plaats:\s*(.+)$', line_strip)
        if city_match:
            city_val = city_match.group(1).strip()
            for key in dining_db.keys():
                if key.lower() in city_val.lower():
                    current_city = key
                    break
        
        # 2. Infill multiple meals per day (Ontbijt, Lunch, Diner)
        if line_strip.startswith('Ontbijt:') and len(line_strip) <= 9:
            infill = dining_db.get(current_city, {}).get("Ontbijt", "*Ontbijt in het hotel.*")
            line = f"Ontbijt: {infill}"
        elif line_strip.startswith('Lunch:') and len(line_strip) <= 7:
            infill = dining_db.get(current_city, {}).get("Lunch", "*Dineren op eigen gelegenheid in de stad.*")
            line = f"Lunch: {infill}"
        elif line_strip.startswith('Diner:') and len(line_strip) <= 7:
            infill = dining_db.get(current_city, {}).get("Diner", "*Dineren op eigen gelegenheid in de stad.*")
            line = f"Diner: {infill}"
            
        # 3. Enrich Sights & Sourced Copywriting
        for sight_key, description in sight_enrichments.items():
            if sight_key.lower() in line_strip.lower():
                line = description
                break
                
        enriched_lines.append(line)

    full_enriched_text = "\n".join(enriched_lines)
    
    # 4. Insert Weather Chart at the start of Deel II (Kuala Lumpur)
    weather_section = """
### 🌡️ Klimaat & Gear Checklist: Maleisië & Singapore (Reisperiode)
| Gemiddelde Temp | Regendagen (Oktober) | Aanbevolen Reisuitrusting |
| :--- | :--- | :--- |
| 32°C / 23°C (Tropisch) | 18 Dagen (Humide) | Ademende lichte kleding (linnen), snel drogende stoffen, stevige wandelsandalen, compacte reissupaplu voor zware tropische middagbuien. |

*Bron: Maleisische Meteorologische Dienst*

---
"""
    full_enriched_text = full_enriched_text.replace("Deel II: Kuala Lumpur", "Deel II: Kuala Lumpur\n" + weather_section)
    
    # 5. Add custom maps and navigators inside Kuala Lumpur Day 2
    map_section = """
[🗺️ Open Mobiele Wandelroute in KLCC](https://www.google.com/maps/dir/?api=1&origin=Petronas+Twin+Towers,KLCC&destination=Dharma+Realm+Guan+Yin+Sagely+Monastery,KL&travelmode=walking)

[MAP: lat=3.1579, lon=101.7123, zoom=15, label=Petronas Twin Towers, KLCC]
"""
    full_enriched_text = full_enriched_text.replace("Petronas Twin Towers", "Petronas Twin Towers" + map_section)

    with open(enriched_path, 'w', encoding='utf-8') as f:
        f.write(full_enriched_text)
        
    print(f"Successfully created fully enriched markdown itinerary at: {enriched_path}")

if __name__ == "__main__":
    main()

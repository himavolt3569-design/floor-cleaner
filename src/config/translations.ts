export const TRANSLATIONS = {
  en: {
    nav: {
      product: "Product",
      benefits: "Benefits",
      howItWorks: "How It Works",
      results: "Results",
      faq: "FAQ",
      contact: "Contact",
      buyNow: "Buy Now",
      cart: "Cart",
      menu: "Menu",
    },
    hero: {
      eyebrow: "Marble . Tile . Granite",
      headline: ["Made for surfaces", "worth looking", "after."],
      body: "A powerful everyday cleaner formulated for marble, granite, tile, floors and driveways. Built to remove dirt, stains and stubborn marks while leaving surfaces clean and refreshed.",
      primaryCta: "Shop TMG Cleaner",
      secondaryCta: "See the results",
      support: "For marble, granite, tile and everyday hard surfaces.",
    },
    intro: {
      eyebrow: "One cleaner. Multiple surfaces.",
      headline: "Built for the surfaces that define your space.",
      body: "Stone and tile carry a room. They also take the most traffic, the most spills and the most cleaning. TMG Cleaner is made for that daily reality: one bottle that works across marble, granite and tile without asking you to keep a different product for every floor in the building.",
    },
    surfaces: {
      eyebrow: "Surface compatibility",
      headline: "Where it works.",
      body: "One bottle across the hard surfaces in a building. On any finish you have not cleaned before, test a small hidden area first.",
      items: {
        marble: {
          name: "Marble",
          body: "Lifts everyday dirt and marks while preserving the polished character of the stone.",
        },
        granite: {
          name: "Granite",
          body: "Refreshes high use stone surfaces and brings back a visibly cleaner finish.",
        },
        tile: {
          name: "Tile",
          body: "Cuts through accumulated dirt and the stubborn marks that settle along grout lines.",
        },
        floors: {
          name: "Floors",
          body: "Made for the floors that get walked on all day, in homes and in busy commercial spaces.",
        },
        driveways: {
          name: "Driveways",
          body: "Works outdoors on the hard surfaces that collect dust, tyre marks and weather.",
        },
      } as Record<string, { name: string; body: string }>,
    },
    results: {
      eyebrow: "Before and after",
      headline: "Drag to see the difference.",
      body: "Photography supplied by TMG Cleaner. Drag the handle, or focus it and use the arrow keys.",
      before: "Before",
      after: "After",
      items: {
        marble: {
          label: "Marble",
          caption: "Removes stains and restores natural beauty.",
        },
        tile: {
          label: "Tile",
          caption: "Cleans tough dirt and stubborn marks.",
        },
        granite: {
          label: "Granite",
          caption: "Brings back the shine and freshness.",
        },
      } as Record<string, { label: string; caption: string }>,
    },
    benefits: {
      eyebrow: "Why it works",
      headline: "What the bottle actually does.",
      body: "Everything listed here is printed on the product by the people who make it. Nothing has been added for effect.",
      items: {
        dirt: {
          title: "Removes dirt, stains and marks",
          body: "Effectively cleans old stains and stubborn dirt that ordinary mopping leaves behind.",
        },
        safe: {
          title: "Safe for surfaces",
          body: "Cleans without damaging the floors you paid to install.",
        },
        gentle: {
          title: "Gentle yet powerful formula",
          body: "Tough on dirt, kind to the surface underneath it.",
        },
        odorless: {
          title: "Odorless and safe to use",
          body: "No harsh smell, so a room stays usable while it is being cleaned.",
        },
        shine: {
          title: "Long lasting shine",
          body: "Leaves floors clean, shiny and fresh rather than dulled by residue.",
        },
        spaces: {
          title: "Home, office and commercial use",
          body: "Practical for a single apartment and for a building cleaned every day.",
        },
      } as Record<string, { title: string; body: string }>,
    },
    product: {
      badge: "The product",
      name: "TMG Marble, Tile and Granite Cleaner",
      description:
        "TMG Cleaner is an everyday cleaner for hard surfaces. It lifts dirt, stains and stubborn marks from marble, tile and granite, and is equally at home on floors and driveways. The formula is odorless and gentle on the surface it cleans, which makes it practical for homes, offices and commercial spaces.",
      selectSize: "Select size",
      inStock: "In stock",
      outOfStock: "Sold out",
      addToCart: "Add to Cart",
      buyNow: "Buy Now",
      deliveryBadge: "Delivered to supported areas in Nepal",
      codBadge: "Cash on delivery available",
      qrBadge: "QR payment accepted",
      totalPrice: "Price",
      quantity: "Quantity",
      variants: {
        "500ml": "500 ml",
        "1l": "1 Litre",
        "5l": "5 Litre",
      } as Record<string, string>,
    },
    howToUse: {
      eyebrow: "How to use",
      headline: "Four steps, start to finish.",
      noteTitle: "Important note",
      usageNote: "Always test a small hidden area first on any surface you have not cleaned before.",
      items: {
        prepare: {
          title: "Prepare the surface",
          body: "Sweep or dust the area first so loose grit is not dragged across the surface.",
        },
        apply: {
          title: "Apply",
          body: "Apply TMG Cleaner following the dilution and application guidance printed on the bottle.",
        },
        clean: {
          title: "Clean",
          body: "Work across the surface evenly with a mop, brush or cloth suited to the material.",
        },
        finish: {
          title: "Finish",
          body: "Let the surface dry, then check the result and repeat on any areas that need it.",
        },
      } as Record<string, { title: string; body: string }>,
    },
    why: {
      eyebrow: "Why TMG",
      headline: "Cleaning should restore a space, not overwhelm it.",
      body: [
        "Most surface cleaners announce themselves. You smell them from the next room, and the room stays unusable until the air clears.",
        "TMG Cleaner is odorless, which matters more than it sounds. It means a shop floor can be cleaned during opening hours, a stairwell can be washed on a weekday morning, and a kitchen goes back into service as soon as it dries.",
        "It is sold in Nepal, delivered from Nepal, and priced for the way people here actually buy: a bottle at a time for the house, or five litres at a time for a building.",
      ],
    },
    faq: {
      eyebrow: "Questions",
      headline: "Good to know.",
      deliveryTitle: "Delivery",
      paymentTitle: "Payment",
      items: {
        surfaces: {
          question: "What surfaces can I use TMG Cleaner on?",
          answer:
            "Marble, granite and tile, plus floors and driveways made of similar hard materials. On any finish you have not cleaned before, test a small hidden area first.",
        },
        how: {
          question: "How do I use the product?",
          answer:
            "Clear loose dust, apply the cleaner following the guidance printed on the bottle, work across the surface with a suitable mop or cloth, then let it dry.",
        },
        outside: {
          question: "Do you deliver outside Kathmandu Valley?",
          answer:
            "Enter your address at checkout and the delivery options available for that location will be shown, along with the fee and the expected time.",
        },
        payment: {
          question: "Which payment methods do you accept?",
          answer:
            "The methods currently accepted are listed at checkout. Options can include cash on delivery, QR payment and bank transfer depending on your delivery area.",
        },
        cod: {
          question: "Can I pay after delivery?",
          answer:
            "Where cash on delivery is available for your area it will appear as a payment option at checkout. If it is not shown, it is not currently available for that location.",
        },
        time: {
          question: "How long does delivery take?",
          answer:
            "Each delivery option shows its own estimate at checkout before you confirm the order.",
        },
        bulk: {
          question: "Can businesses order in larger quantities?",
          answer:
            "Yes. The 5 litre size is intended for regular and commercial cleaning. For larger or repeat orders, contact us using the details in the footer.",
        },
      } as Record<string, { question: string; answer: string }>,
    },
    cta: {
      eyebrow: "Ready when you are",
      headline: "Order TMG Cleaner.",
      body: "For marble, tile, granite and everyday hard surfaces. Delivered directly to your home or site across Nepal.",
      button: "Order TMG Cleaner",
    },
    footer: {
      tagline:
        "Stain and dirt remover for marble, tile, granite, floors and driveways. Sold and delivered in Nepal.",
      contact: "Contact",
      rights: "All rights reserved.",
    },
  },
  ne: {
    nav: {
      product: "उत्पादन",
      benefits: "फाइदाहरू",
      howItWorks: "प्रयोग विधि",
      results: "नतिजा",
      faq: "प्रायः सोधिने प्रश्न",
      contact: "सम्पर्क",
      buyNow: "अहिले किन्नुहोस्",
      cart: "कार्ट",
      menu: "मेनु",
    },
    hero: {
      eyebrow: "मार्बल • टाइल • ग्रेनाइट",
      headline: ["सतहहरूको विशेष हेरचाह,", "तपाईंको घरको", "चम्किलो सुन्दरता।"],
      body: "मार्बल, ग्रेनाइट, टाइल, भुइँ र ड्राइभवेका लागि विशेष रूपमा तयार पारिएको शक्तिशाली क्लिनर। पुरानो दाग र फोहोर हटाउँछ र सतहलाई सुरक्षित र चम्किलो राख्छ।",
      primaryCta: "TMG क्लिनर किन्नुहोस्",
      secondaryCta: "नतिजा हेर्नुहोस्",
      support: "मार्बल, ग्रेनाइट, टाइल र सबै कडा सतहहरूका लागि उपयुक्त।",
    },
    intro: {
      eyebrow: "एउटै क्लिनर • सबै सतहका लागि",
      headline: "तपाईंको घर तथा अफिसको सतहहरूका लागि भरपर्दो समाधान।",
      body: "ढुङ्गा र टाइलले कोठालाई सुन्दर बनाउँछन्। तर त्यसमा धेरै फोहोर र दाग पनि लाग्छ। TMG क्लिनर यसैका लागि बनाइएको हो: एउटै बोतलले मार्बल, ग्रेनाइट र टाइल सबै सफा गर्छ—प्रत्येक सतहका लागि छुट्टाछुट्टै उत्पादन किन्नु पर्दैन।",
    },
    surfaces: {
      eyebrow: "सतह अनुकूलता",
      headline: "कुन-कुन सतहमा काम गर्छ।",
      body: "भवनका सबै कडा सतहहरूमा सुरक्षित रूपमा प्रयोग गर्न सकिन्छ। नयाँ सतहमा पहिले सानो ठाउँमा परीक्षण गर्नुहोस्।",
      items: {
        marble: {
          name: "मार्बल",
          body: "मार्बलको प्राकृतिक चमक सुरक्षित राख्दै दैनिक फोहोर, पानीका दाग र कडा दागहरू सजिलै हटाउँछ।",
        },
        granite: {
          name: "ग्रेनाइट",
          body: "धेरै प्रयोग हुने ढुङ्गाका सतहहरूलाई पुनर्ताजगी दिएर सफा र चम्किलो बनाउँछ।",
        },
        tile: {
          name: "टाइल",
          body: "टाइलको सतह र जोर्नीहरू (grout) मा जमेको पुरानो फोहोर सजिलै सफा गर्छ।",
        },
        floors: {
          name: "भुइँहरू",
          body: "घर र व्यस्त व्यावसायिक ठाउँहरूमा दिनभर हिँडडुल हुने भुइँहरूका लागि विशेष निर्मित।",
        },
        driveways: {
          name: "ड्राइभवे",
          body: "धुलो, टायरको दाग र बाहिरी मौसमले फोहोर भएका कडा बाहिरी सतहहरू सफा गर्छ।",
        },
      } as Record<string, { name: string; body: string }>,
    },
    results: {
      eyebrow: "पहिले र पछि",
      headline: "सफा गरेपछिको अन्तर आफैं हेर्नुहोस्।",
      body: "वास्तविक परिणाम हेर्न स्लाइडरलाई दायाँ-बायाँ सार्नुहोस्।",
      before: "पहिले",
      after: "पछि",
      items: {
        marble: {
          label: "मार्बल",
          caption: "कडा दागहरू हटाएर मार्बलको प्राकृतिक सुन्दरता फर्काउँछ।",
        },
        tile: {
          label: "टाइल",
          caption: "टाइल र जोर्नीमा जमेको कडा फोहोर सफा गर्छ।",
        },
        granite: {
          label: "ग्रेनाइट",
          caption: "ग्रेनाइटको चमक र नयाँपन पुनर्जीवित गर्छ।",
        },
      } as Record<string, { label: string; caption: string }>,
    },
    benefits: {
      eyebrow: "किन प्रभावकारी छ",
      headline: "TMG क्लिनरले के-के गर्छ?",
      body: "यहाँ उल्लेख गरिएका सबै बुँदाहरू उत्पादनको परीक्षण र यथार्थ परिणाममा आधारित छन्।",
      items: {
        dirt: {
          title: "फोहोर, दाग र कडा दागहरू हटाउँछ",
          body: "सामान्य पुछाइले नहट्ने पुरानो फोहोर र कडा दागहरूलाई प्रभावकारी रूपमा सफा गर्छ।",
        },
        safe: {
          title: "सतहको लागि पूर्ण रूपमा सुरक्षित",
          body: "तपाईंले महँगो खर्च गरेर राखेको मार्बल र टाइलको चमक बिगार्दैन।",
        },
        gentle: {
          title: "कोमल तर शक्तिशाली फर्मुला",
          body: "फोहोरमा कडा, तर भुइँको सतहमा पूर्ण रूपमा सुरक्षित।",
        },
        odorless: {
          title: "गन्धविहीन र प्रयोग गर्न सहज",
          body: "कुनै चर्को रासायनिक गन्ध छैन, सफा गर्दागर्दै पनि कोठा प्रयोग गर्न सकिन्छ।",
        },
        shine: {
          title: "दीर्घकालीन चमक",
          body: "सतहलाई फिक्का नबनाई सफा, चम्किलो र ताजा राख्छ।",
        },
        spaces: {
          title: "घर, अफिस र व्यावसायिक प्रयोजन",
          body: "एउटा सानो कोठादेखि दैनिक सफा गर्नुपर्ने ठूला भवनहरूका लागि उत्तिकै व्यावहारिक।",
        },
      } as Record<string, { title: string; body: string }>,
    },
    product: {
      badge: "उत्पादन विवरण",
      name: "TMG मार्बल, टाइल र ग्रेनाइट क्लिनर",
      description:
        "TMG क्लिनर कडा सतहहरू सफा गर्ने दैनिक क्लिनर हो। यसले मार्बल, टाइल र ग्रेनाइटबाट फोहोर, दाग र कडा दागहरू सजिलै हटाउँछ। यो भुइँ र ड्राइभवेका लागि पनि उत्तिकै प्रभावकारी छ। यसको फर्मुला पूर्ण रूपमा गन्धविहीन र सतहमा कोमल छ, जसले गर्दा यो घर, अफिस र व्यावसायिक ठाउँहरूका लागि एकदमै व्यावहारिक छ।",
      selectSize: "साइज छान्नुहोस्",
      inStock: "स्टकमा उपलब्ध",
      outOfStock: "स्टक सकियो",
      addToCart: "कार्टमा थप्नुहोस्",
      buyNow: "अहिले किन्नुहोस्",
      deliveryBadge: "नेपालका समर्थित क्षेत्रहरूमा डेलिभरी",
      codBadge: "डेलिभरीमा भुक्तानी (COD) सुविधा",
      qrBadge: "QR भुक्तानी स्वीकृत",
      totalPrice: "मूल्य",
      quantity: "संख्या",
      variants: {
        "500ml": "५०० मिलि",
        "1l": "१ लिटर",
        "5l": "५ लिटर",
      } as Record<string, string>,
    },
    howToUse: {
      eyebrow: "प्रयोग विधि",
      headline: "चार सरल चरणहरू, सुरुदेखि अन्त्यसम्म।",
      noteTitle: "विशेष ध्यान दिनुहोस्",
      usageNote: "नयाँ सतहमा प्रयोग गर्नुअघि सधैं सानो नदेखिने ठाउँमा परीक्षण गर्नुहोस्।",
      items: {
        prepare: {
          title: "सतह तयार गर्नुहोस्",
          body: "सतहबाट धुलो र फोहोर सुक्खा कपडा वा झाडुले सफा गर्नुहोस् ताकि भुइँमा कोतरिन नपाओस्।",
        },
        apply: {
          title: "क्लिनर लगाउनुहोस्",
          body: "बोतलमा दिइएको निर्देशन अनुसार TMG क्लिनर सिधै वा आवश्यकता अनुसार पानीमा मिसाएर लगाउनुहोस्।",
        },
        clean: {
          title: "सफा गर्नुहोस्",
          body: "उपयुक्त मोप, ब्रस वा कपडाको सहायताले सतहमा समान रूपमा फैलाएर सफा गर्नुहोस्।",
        },
        finish: {
          title: "सुकाउनुहोस् र अन्तिम रूप दिनुहोस्",
          body: "सतहलाई सुक्न दिनुहोस्, त्यसपछि चमक हेर्नुहोस् र आवश्यक परे दोहोर्याउनुहोस्।",
        },
      } as Record<string, { title: string; body: string }>,
    },
    why: {
      eyebrow: "किन TMG?",
      headline: "सफाइले ठाउँलाई पुनर्ताजगी दिनुपर्छ, दुर्गन्ध होइन।",
      body: [
        "अधिकांश क्लिनरहरू प्रयोग गर्दा चर्को रासायनिक गन्ध आउँछ। अर्को कोठासम्म गन्ध फैलिन्छ र हावा सफा नहुन्जेल त्यो ठाउँ प्रयोग गर्नै सकिँदैन।",
        "TMG क्लिनर पूर्ण रूपमा गन्धविहीन छ, जुन धेरै महत्त्वपूर्ण कुरा हो। यसको मतलब पसल वा अफिस खुल्ला रहेकै बेला पनि सफा गर्न सकिन्छ, सिँढीहरू जुनसुकै बेला धुन सकिन्छ, र भान्सा सुक्नासाथ तुरुन्तै काम सुरु गर्न सकिन्छ।",
        "यो नेपालमै बिक्री गरिन्छ, नेपालबाटै डेलिभरी हुन्छ, र नेपाली ग्राहकहरूको आवश्यकता अनुसार ५०० मिलि, १ लिटर र ५ लिटरको प्याकमा सुलभ मूल्यमा उपलब्ध छ।",
      ],
    },
    faq: {
      eyebrow: "जिज्ञासाहरू",
      headline: "प्रायः सोधिने प्रश्नहरू।",
      deliveryTitle: "डेलिभरी",
      paymentTitle: "भुक्तानी",
      items: {
        surfaces: {
          question: "TMG क्लिनर कुन-कुन सतहमा प्रयोग गर्न सकिन्छ?",
          answer:
            "मार्बल, ग्रेनाइट र टाइल, साथै भुइँ र ड्राइभवे जस्ता कडा सतहहरूमा प्रयोग गर्न सकिन्छ। नयाँ सतहमा पहिले सानो ठाउँमा परीक्षण गर्नुहोस्।",
        },
        how: {
          question: "यो उत्पादन कसरी प्रयोग गर्ने?",
          answer:
            "सतहको धुलो सफा गर्नुहोस्, बोतलमा उल्लेख भए अनुसार क्लिनर लगाउनुहोस्, मोप वा कपडाले सफा गर्नुहोस् र सुक्न दिनुहोस्।",
        },
        outside: {
          question: "के काठमाडौं उपत्यका बाहिर पनि डेलिभरी हुन्छ?",
          answer:
            "चेकआउट गर्दा आफ्नो ठेगाना राख्नुहोस्। तपाईंको स्थानका लागि उपलब्ध डेलिभरी विकल्प, शुल्क र अनुमानित समय त्यहाँ देखाइनेछ।",
        },
        payment: {
          question: "भुक्तानीका कुन-कुन माध्यमहरू उपलब्ध छन्?",
          answer:
            "तपाईंको क्षेत्र अनुसार डेलिभरीमा भुक्तानी (COD), QR कोड स्क्यान र बैंक ट्रान्सफर उपलब्ध छन्।",
        },
        cod: {
          question: "सामान पाएपछि मात्र पैसा तिर्न मिल्छ?",
          answer:
            "हो, तपाईंको ठेगानामा क्यास अन डेलिभरी (COD) सेवा उपलब्ध छ भने चेकआउटमा यो विकल्प देखिनेछ।",
        },
        time: {
          question: "डेलिभरी हुन कति समय लाग्छ?",
          answer:
            "अर्डर निश्चित गर्नुअघि चेकआउटमा तपाईंको स्थान अनुसार अनुमानित डेलिभरी समय देखाइनेछ।",
        },
        bulk: {
          question: "के व्यावसायिक प्रयोजनका लागि धेरै परिमाणमा अर्डर गर्न सकिन्छ?",
          answer:
            "सकिन्छ। ५ लिटरको बोतल नियमित र व्यावसायिक सफाइका लागि उपयुक्त छ। ठूलो परिमाणका लागि तल दिइएको सम्पर्क नम्बरमा सम्पर्क गर्नुहोस्।",
        },
      } as Record<string, { question: string; answer: string }>,
    },
    cta: {
      eyebrow: "सजिलो अर्डर",
      headline: "TMG क्लिनर अर्डर गर्नुहोस्।",
      body: "मार्बल, टाइल, ग्रेनाइट र सबै कडा सतहहरूका लागि। नेपालभर तपाईंको घर वा कार्यस्थलमै डेलिभरी।",
      button: "अहिले अर्डर गर्नुहोस्",
    },
    footer: {
      tagline:
        "नेपालमा मार्बल, टाइल, ग्रेनाइट र भुइँ सफा गर्ने भरपर्दो क्लिनर। नेपालभर सुरक्षित डेलिभरी।",
      contact: "सम्पर्क",
      rights: "सबै अधिकार सुरक्षित।",
    },
  },
} as const;

export type TranslationKeys = typeof TRANSLATIONS.en;

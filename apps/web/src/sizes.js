const frameCategories = new Set(['normal-frames','anime-neon-art','supercar-neon-frames']);
const metricCategories = new Set([...frameCategories,'canvas-prints','mouse-pads','flags']);
const chartDimensions = new Set(['20x30','30x40','40x50','50x60','50x70']);
const comparison = {
  '20x30':['About the size of an A4 sheet (21 × 29.7 cm).','يقارب مقاس ورقة A4 ‏(٢١ × ٢٩٫٧ سم).'],
  '30x40':['Close to an A3 sheet (29.7 × 42 cm).','يقارب مقاس ورقة A3 ‏(٢٩٫٧ × ٤٢ سم).'],
  '50x70':['Close to a B2 sheet (50 × 70.7 cm).','يقارب مقاس ورقة B2 ‏(٥٠ × ٧٠٫٧ سم).'],
  '40x50':['A little wider and longer than an A3 sheet.','أعرض وأطول قليلًا من ورقة A3.'],
  '40x60':['A little smaller than an A2 sheet.','أصغر قليلًا من ورقة A2.'],
  '40x65':['About as wide as an A2 sheet, with extra length.','يقارب عرض ورقة A2 مع طول إضافي.'],
  '45x75':['A little narrower and longer than a B2 sheet.','أضيق وأطول قليلًا من ورقة B2.'],
  '45x80':['Narrower and longer than a B2 sheet.','أضيق وأطول من ورقة B2.'],
  '50x60':['About as wide as a B2 sheet and shorter.','يقارب عرض ورقة B2 لكنه أقصر.'],
  '50x90':['About as wide as a B2 sheet, with extra length.','يقارب عرض ورقة B2 مع طول إضافي.'],
  '50x100':['The longer edge is about the length of a meter stick.','الضلع الأطول يقارب طول مسطرة مترية.'],
  '60x70':['About as wide as an A1 sheet and shorter.','يقارب عرض ورقة A1 لكنه أقصر.'],
  '60x80':['Close to the footprint of an A1 sheet.','يقارب مساحة ورقة A1.'],
  '60x90':['About as wide as an A1 sheet, with extra length.','يقارب عرض ورقة A1 مع طول إضافي.'],
  '70x80':['A little wider and shorter than an A1 sheet.','أعرض وأقصر قليلًا من ورقة A1.'],
  '70x100':['Close to a B1 poster sheet.','يقارب مقاس ملصق B1.'],
  '80x100':['A little narrower and shorter than an A0 sheet.','أضيق وأقصر قليلًا من ورقة A0.'],
  '60x120':['About as long as an A0 sheet and much narrower.','يقارب طول ورقة A0 لكنه أضيق بكثير.'],
  '100x150':['Close to a B0 poster sheet, with a little extra length.','يقارب ملصق B0 مع طول إضافي بسيط.'],
  '100x200':['About as long as two meter sticks end to end.','يقارب طوله مسطرتين متريتين متتاليتين.'],
  '18x20':['About the size of a small notebook.','يقارب حجم دفتر صغير.']
};
const guidance={
  'mouse-pads':['Use a notebook as a visual marker on your desk, and leave space next to your keyboard for comfortable mouse movement.','استخدم دفترًا كمرجع بصري على مكتبك، واترك مساحة بجوار لوحة المفاتيح لتحريك الماوس بسهولة.'],
  'acrylic-coasters':['Use the base of your usual mug as a reference when choosing a coaster.','استخدم قاعدة كوبك المعتاد كمرجع عند اختيار قاعدة الأكواب.'],
  flags:['Use the edge of a table or a tape measure to visualize the flag before hanging it.','استخدم حافة طاولة أو شريط قياس لتصور حجم العلم قبل تعليقه.']
};
const wallGuidance=['Try arranging sheets of paper on the wall to preview how much space the artwork will use.','جرّب ترتيب أوراق على الحائط لتصور المساحة التي ستشغلها اللوحة.'];
const numbers=(value,lang)=>lang==='ar'?value.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):value;
export function sizeInfo(value='',category='',lang='en') {
  const i=lang==='ar'?1:0;
  const normalized=value.trim().replace(/\s+/g,' ');
  const inches=normalized.match(/^(\d+(?:\.\d+)?)\s*(?:inch(?:es)?|in|")$/i);
  if(category==='laptop-sleeves'){
    const reference=inches&&Number(inches[1])<=14
      ? ['Think of a compact notebook as a rough reference.','تخيّل دفترًا صغيرًا كمرجع تقريبي.']
      : ['Think of a large notebook or document folder as a rough reference.','تخيّل دفترًا كبيرًا أو ملف مستندات كمرجع تقريبي.'];
    const fit=['Measure the outside of your laptop and check the sleeve’s dimensions before ordering.','قِس الأبعاد الخارجية للابتوب وتحقق من أبعاد الجراب قبل الطلب.'];
    return {label:inches?numbers(inches[1],lang)+(i?' بوصة':' in'):variantLabel(value,lang),chart:false,comparison:reference[i]+' '+fit[i]};
  }
  const match=normalized.match(/^(\d+(?:\.\d+)?)\s*(?:width\s*)?[x×*]\s*(\d+(?:\.\d+)?)(?:\s*(cm|سم|long|length))?$/i);
  if(!match||(!match[3]&&!metricCategories.has(category)))return {label:variantLabel(value,lang),chart:false,comparison:(guidance[category]||wallGuidance)[i]};
  const key=[Number(match[1]),Number(match[2])].sort((a,b)=>a-b).join('x');
  return {
    label:numbers(match[1]+' × '+match[2],lang)+(lang==='ar'?' سم':' cm'),
    chart:frameCategories.has(category)&&chartDimensions.has(key),
    comparison:(comparison[key]||guidance[category]||wallGuidance)[i]
  };
}
export function variantLabel(value='',lang='en',category='') {
  if(category)return sizeInfo(value,category,lang).label;
  if(lang==='ar'&&/^standard$/i.test(value))return 'قياسي';
  return numbers(value.replace(/(?<=\d)\s*[*x]\s*(?=\d)/gi,' × ').replaceAll('—',' - ').replace(/\bcm\b/gi,lang==='ar'?'سم':'cm'),lang);
}

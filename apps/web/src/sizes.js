const frameCategories = new Set(['normal-frames','anime-neon-art','supercar-neon-frames']);
const metricCategories = new Set([...frameCategories,'canvas-prints','mouse-pads','flags']);
const chartDimensions = new Set(['20x30','30x40','40x50','50x60','50x70']);
const comparison = {
  '20x30':['About the size of an A4 sheet (21 × 29.7 cm).','يقارب مقاس ورقة A4 ‏(٢١ × ٢٩٫٧ سم).'],
  '30x40':['Close to an A3 sheet (29.7 × 42 cm).','يقارب مقاس ورقة A3 ‏(٢٩٫٧ × ٤٢ سم).'],
  '50x70':['Close to a B2 sheet (50 × 70.7 cm).','يقارب مقاس ورقة B2 ‏(٥٠ × ٧٠٫٧ سم).'],
  '18x20':['About the size of a small notebook.','يقارب حجم دفتر صغير.']
};
const numbers=(value,lang)=>lang==='ar'?value.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]):value;
export function sizeInfo(value='',category='',lang='en') {
  const match=value.trim().match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)(?:\s*(cm|سم))?$/i);
  if(!match||(!match[3]&&!metricCategories.has(category)))return {label:variantLabel(value,lang),chart:false};
  const key=[Number(match[1]),Number(match[2])].sort((a,b)=>a-b).join('x');
  return {
    label:numbers(match[1]+' × '+match[2],lang)+(lang==='ar'?' سم':' cm'),
    chart:frameCategories.has(category)&&chartDimensions.has(key),
    comparison:(key==='18x20'&&category!=='mouse-pads'?undefined:comparison[key])?.[lang==='ar'?1:0]
  };
}
export function variantLabel(value='',lang='en',category='') {
  if(category)return sizeInfo(value,category,lang).label;
  if(lang==='ar'&&/^standard$/i.test(value))return 'قياسي';
  return numbers(value.replace(/(?<=\d)\s*[*x]\s*(?=\d)/gi,' × ').replaceAll('—',' - ').replace(/\bcm\b/gi,lang==='ar'?'سم':'cm'),lang);
}

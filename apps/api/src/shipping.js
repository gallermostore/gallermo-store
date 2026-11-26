const entries = [
  ['cairo','Cairo','القاهرة'], ['giza','Giza','الجيزة'],
  ['alexandria','Alexandria','الإسكندرية'], ['aswan','Aswan','أسوان'],
  ['asyut','Asyut','أسيوط'], ['beheira','Beheira','البحيرة'],
  ['beni-suef','Beni Suef','بني سويف'], ['dakahlia','Dakahlia','الدقهلية'],
  ['damietta','Damietta','دمياط'], ['faiyum','Faiyum','الفيوم'],
  ['gharbia','Gharbia','الغربية'], ['ismailia','Ismailia','الإسماعيلية'],
  ['kafr-el-sheikh','Kafr El Sheikh','كفر الشيخ'], ['luxor','Luxor','الأقصر'],
  ['matrouh','Matrouh','مطروح'], ['minya','Minya','المنيا'],
  ['monufia','Monufia','المنوفية'], ['new-valley','New Valley','الوادي الجديد'],
  ['north-sinai','North Sinai','شمال سيناء'], ['port-said','Port Said','بورسعيد'],
  ['qalyubia','Qalyubia','القليوبية'], ['qena','Qena','قنا'],
  ['red-sea','Red Sea','البحر الأحمر'], ['sharqia','Sharqia','الشرقية'],
  ['sohag','Sohag','سوهاج'], ['south-sinai','South Sinai','جنوب سيناء'],
  ['suez','Suez','السويس']
];
export const governorates = entries.map(([id,en,ar]) => ({
  id, name:{en,ar}, shippingPiastres:id==='cairo'||id==='giza'?9000:12000
}));
export const shippingZone = id => governorates.find(zone=>zone.id===id);

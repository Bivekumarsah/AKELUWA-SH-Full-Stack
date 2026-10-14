// Nepal's geographic directory: names only. District pages and office records
// must be verified individually before they can be published as official guidance.
// District references: https://election.gov.np/en/election-offices
// Province names: https://ntb.gov.np/en/provinces
const NEPAL_REGIONS = [
  {name:"Koshi", districts:["Bhojpur","Dhankuta","Ilam","Jhapa","Khotang","Morang","Okhaldhunga","Panchthar","Sankhuwasabha","Solukhumbu","Sunsari","Taplejung","Terhathum","Udayapur"]},
  {name:"Madhesh", districts:["Bara","Dhanusha","Mahottari","Parsa","Rautahat","Saptari","Sarlahi","Siraha"]},
  {name:"Bagmati", districts:["Bhaktapur","Chitwan","Dhading","Dolakha","Kathmandu","Kavrepalanchok","Lalitpur","Makwanpur","Nuwakot","Ramechhap","Rasuwa","Sindhuli","Sindhupalchok"]},
  {name:"Gandaki", districts:["Baglung","Gorkha","Kaski","Lamjung","Manang","Mustang","Myagdi","Nawalpur (East Nawalparasi)","Parbat","Syangja","Tanahun"]},
  {name:"Lumbini", districts:["Arghakhanchi","Banke","Bardiya","Dang","Gulmi","Kapilvastu","Palpa","Parasi (West Nawalparasi)","Pyuthan","Rolpa","Rupandehi","Rukum East"]},
  {name:"Karnali", districts:["Dailekh","Dolpa","Humla","Jajarkot","Jumla","Kalikot","Mugu","Rukum West","Salyan","Surkhet"]},
  {name:"Sudurpashchim", districts:["Achham","Baitadi","Bajhang","Bajura","Dadeldhura","Darchula","Doti","Kailali","Kanchanpur"]}
];
if (NEPAL_REGIONS.reduce((total, region) => total + region.districts.length, 0) !== 77) {
  throw new Error("Nepal district index must contain 77 entries");
}

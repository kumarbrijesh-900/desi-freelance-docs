const url = "https://mjrbytfvesgvbuxyoidp.supabase.co/functions/v1/parse-brief";
const anonKey = "sb_publishable_FopBtXFCEu19aEcN-xCiJw_AN6LoOyB";
const input = {
  briefText: "Please create an invoice for Metro Shoes Pvt Ltd. My business name is DesiFreelanceDocs Studio. I am GST registered. GSTIN 29ABCDE1234F1Z5. Deliverable: logo design for ₹18,000. Payment terms: Net 15.",
  ocrText: "",
  voiceTranscript: "",
  attachmentSummary: "",
  combinedText: "Typed brief:\nPlease create an invoice for Metro Shoes Pvt Ltd. My business name is DesiFreelanceDocs Studio. I am GST registered. GSTIN 29ABCDE1234F1Z5. Deliverable: logo design for ₹18,000. Payment terms: Net 15."
};

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": anonKey,
    "Authorization": `Bearer ${anonKey}`
  },
  body: JSON.stringify(input)
}).then(async r => {
  console.log(r.status, r.statusText);
  const text = await r.text();
  console.log(text);
}).catch(console.error);

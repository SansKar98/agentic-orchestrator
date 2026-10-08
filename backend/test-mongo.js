const mongoose = require('mongoose');
const uri = "mongodb+srv://pandeyansh750_db_user:G4ypi1z97wJfBroj@cluster0.cdtx9zj.mongodb.net/?appName=Cluster0";
console.log("Connecting...");
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, tls: true, tlsAllowInvalidCertificates: true })
.then(() => { console.log("SUCCESS"); process.exit(0); })
.catch(err => { console.error("ERROR", err.message); process.exit(1); });

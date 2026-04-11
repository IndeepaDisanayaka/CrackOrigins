
const admin = require('firebase-admin');

const serviceAccount = {
  projectId: "crack-origins",
  clientEmail: "firebase-adminsdk-fbsvc@crack-origins.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCw/tC5jBR8ZCm0\nhEO+ZwXpx60BPl7X7y956pbfxtqyxqM7+SQWSrgFiz5fz+YkiQaNbBvG/WJeJ7AJ\nKRB+HnwJuogxWRp3Isb0tLZGuVzfAzlltzKj83OjnZeknfUmws3Gh2HM6V3KdTlt\ndb5BGpevCGSZpaFoR9KkJz/Bz7O4r1UX+sbApE5fUpuN5MUP/hedwAEPdA3oIF/j\nmTLUdIbvJRxfdtm/yIVfTZK/I/lk2swZAjl/0Ns7DMcAGF5difAnEBxoehqFCYT9\nIndNyVEN21b8n3v+3pyNKZckBL+j7baDo/uLCY4JzGCrCCvwkIzMqWrJf0V2X1in\nw+dTSNlvAgMBAAECggEABmxLJILo22h5aLAxybqDX9mgUQxhPeBBV6ojtl1/4j9D\nIcjjEKd1f0cmUghc0I+/SbKM74Ft6GzPIyqJL9Of85FJWRyIY575wDecWA3Wkhgd\nAIv0QDgGokg9x2gdMNCeqVtry3K6SAjf237CXCp3dGqhjj+RD11wdAbYmpyCZ/3c\nSP0CK2s3kujmLSLlyFzIWN8XJu6afHCG4hsjVwlFUcB/PROKHxiSwYTjHtD0xv8s\nApdo6vJpEHSrmWxBZKJRofSGCA5zragtFfqnIKiWJZF/BkWkiFug0mnnZPNJ8jEW\nYQxc1c1Wl57OAaLqd9Wn5T7zh+95+0MToafB26jAgQKBgQDVy2c8oJJoP/e95h/p\n+JB3b+87g4krKjEIe339oelmGm8VgQCIQGaBgxqHGB1i7Liw7pSfmqnTeFE27cbK\n4WRhaStTwQFW99o9zb1PIEchJkr7aHnjnB/Cmt5y3//ka73E5QGh+nDv+oB5E8dv\nu85W52MwblyLdu56L3lR0YO/qQKBgQDT766Cc8Hce5E+7YcIYVTyHYPCj5qGhSU8\nDzFhP/K7ggg4F13NF8IEAQUnDkp5z6p0iGol4bgBbJ43lLuu8feczD08Kr2+bz7a\nJNf/eLQD0RcPVSbFAqa8Yw2vJzClfGG0X3oa1rp3Y/eGHP83ivsS5GoQxdZfSPQA\nh03F+itfVwKBgBQch0CfxkYCRnbZsATdehGSOQn7LKsf0+79VvPGCGOvduWp9ffb\nPwlN4O/2Z8VHiXQzbU26SeF3vwQQyBOLslqrfwTo8gxRUnlf4kAQRECtDn6p7FVp\n+V7gHK7nvXWqYPalqEqpeXhJs04weyFapGVubNlAeHoyHOrnjl0Q/XjJAoGAGxpS\nqdId35FZ0L9VfmfcEh5eJDpzG3LZgSW8PeCMrRgC7xFl6H16TULIIud79Lnu5Xow\ngOmtu1jlntwBaGz/KmkgB5q7qyfU1NbTXJNWCgrqNQbBr34YTo0oSdbsLK2MXSG8\nnsQJEo2RMPByXusCErdtLPnv4T2WHp8u/ftxIn8CgYAP3fdIAfzmgutfK5ikMdu0\n9amblR6NfGiwZvcgzOcRtIy2aZF770OrCNaMNkkrtkLotj+gjlWCwcv3y6fBJ1D+\noeX+ACRtxkulqLCMCs9YYXDGAx+BugBN8l1F6cZQPFFDqPgAD13yXYgwk86FxJVR\njLNEb+0uxhXo2W2aIswMnQ==\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n')
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection('offers').get();
  console.log('Got', snap.size, 'offers');
  snap.forEach(doc => {
    console.log(doc.id, doc.data().title, doc.data().lemonVariantId);
  });
  process.exit(0);
}

run().catch(console.error);

const { MongoClient, ServerApiVersion } = require('mongodb');
const Document = require("./Document");
const io = require("socket.io")(3001, {
  cors: {
    origin: "https://my-doc-self.vercel.app/",
    methods: ["GET", "POST"],
  },
});

// MongoDB connection URI with the password properly replaced and encoded if necessary
const uri = "mongodb+srv://chinmayar2003:AsdfAsdf@cluster0.iqu1k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const defaultValue = "";

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const database = client.db("myDatabase");
    const documentsCollection = database.collection("documents");

    // Socket.io connection handling
    io.on("connection", (socket) => {
      socket.on("get-document", async (documentId) => {
        const document = await findOrCreateDocument(documentId, documentsCollection);
        socket.join(documentId);
        socket.emit("load-document", document.data);

        socket.on("send-changes", (delta) => {
          socket.broadcast.to(documentId).emit("receive-changes", delta);
        });

        socket.on("save-document", async (data) => {
          await documentsCollection.updateOne(
            { _id: documentId },
            { $set: { data } },
            { upsert: true }
          );
        });
      });
    });

    console.log("Socket.io server is running on port 3001");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  }
}
run().catch(console.dir);

// Function to find or create a document
async function findOrCreateDocument(id, collection) {
  if (id == null) return;

  const document = await collection.findOne({ _id: id });
  if (document) return document;
  
  await collection.insertOne({ _id: id, data: defaultValue });
  return { _id: id, data: defaultValue };
}

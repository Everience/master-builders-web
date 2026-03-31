const { BlobServiceClient } = require("@azure/storage-blob");
const fs = require("fs");
const path = require("path");

// --- CONFIGURAZIONE ---
// Inserisci la tua connection string del blob
const connectionString =
  "DefaultEndpointsProtocol=https;AccountName=masterbuilderbackend;AccountKey=g2XrgrvjrbrLXMQzos1fBQTVI/aVAKBRADtzapG73ohuo36Xzh9C+UShsRquolwHRZftuVQ1r0WK+ASt7X1FYA==;EndpointSuffix=core.windows.net";
const containerName = "project-files"; // nome del container
const filePath = path.join(__dirname, "testfile.txt"); // file di prova
const blobName = "testfile-" + Date.now() + ".txt"; // nome unico per il blob

async function main() {
  try {
    // 1. Connessione al servizio Blob
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    // 2. Recupero del container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // --- opzionale: crea container se non esiste ---
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create();
      console.log("Container creato:", containerName);
    }

    // 3. Upload del file
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadFile(filePath);

    console.log("File caricato con successo!");
    console.log("URL del blob:", blockBlobClient.url);
  } catch (err) {
    console.error("Errore durante l'upload:", err.message);
  }
}

main();

const { getGraphClient } = require("./GraphClient");

async function uploadFileToSharePoint(fileStream, projectId, filename) {
  const client = await getGraphClient();
  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const path = `${projectId}/${safeName}`;

  const chunks = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const res = await client
    .api(
      `/sites/${process.env.SHAREPOINT_SITE_ID}/drives/${process.env.SHAREPOINT_DRIVE_ID}/root:/${path}:/content`
    )
    .put(buffer);

  return res.webUrl;
}

async function deleteFileFromSharePoint(projectId, filename) {
  const client = await getGraphClient();
  const safeName = filename.replace(/[^\w.\-]/g, "_"); // ✅ coerente con upload
  const path = `${projectId}/${safeName}`;
  await client
    .api(
      `/sites/${process.env.SHAREPOINT_SITE_ID}/drives/${process.env.SHAREPOINT_DRIVE_ID}/root:/${path}`
    )
    .delete();
}

module.exports = { uploadFileToSharePoint, deleteFileFromSharePoint };

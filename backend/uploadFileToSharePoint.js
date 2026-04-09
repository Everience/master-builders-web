const { getGraphClient } = require("./GraphClient");

async function uploadFileToSharePoint(
  fileStream,
  projectName,
  projectPhase,
  filename
) {
  const client = await getGraphClient();

  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const safeProject = projectName.replace(/[^\w.\- ]/g, "_").trim();
  const safePhase = projectPhase.replace(/[^\w.\- ]/g, "_").trim();

  const parentFolder = safeProject;
  const childFolder = `${safeProject} - ${safePhase}`;
  const path = `${parentFolder}/${childFolder}/${safeName}`;

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

async function deleteFileFromSharePoint(projectName, projectPhase, filename) {
  const client = await getGraphClient();

  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const safeProject = projectName.replace(/[^\w.\- ]/g, "_").trim();
  const safePhase = projectPhase.replace(/[^\w.\- ]/g, "_").trim();

  const childFolder = `${safeProject} - ${safePhase}`;
  const path = `${safeProject}/${childFolder}/${safeName}`;

  await client
    .api(
      `/sites/${process.env.SHAREPOINT_SITE_ID}/drives/${process.env.SHAREPOINT_DRIVE_ID}/root:/${path}`
    )
    .delete();
}

async function getFolderUrl(projectName, projectPhase) {
  const client = await getGraphClient();

  const safeProject = projectName.replace(/[^\w.\- ]/g, "_").trim();
  const safePhase = projectPhase.replace(/[^\w.\- ]/g, "_").trim();

  const childFolder = `${safeProject} - ${safePhase}`;
  const path = `${safeProject}/${childFolder}`;

  const res = await client
    .api(
      `/sites/${process.env.SHAREPOINT_SITE_ID}/drives/${process.env.SHAREPOINT_DRIVE_ID}/root:/${path}`
    )
    .get();

  return res.webUrl;
}

module.exports = {
  uploadFileToSharePoint,
  deleteFileFromSharePoint,
  getFolderUrl,
};

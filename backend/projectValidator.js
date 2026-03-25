/*const projectSchema = {
  project_name: { required: true, type: "string" },
  project_code: { required: true, type: "string" },
  region: { required: true, type: "string" },
  market_segment: { required: true, type: "string" },
  project_phase: { required: true, type: "string" },
  project_status: { required: true, type: "string" },
  notes: { required: true, type: "string" },
  project_visibility: { required: true, type: "string" },
  innovation_area: { required: true, type: "string" },
  attachments_link: { required: false, type: "string" },
};

function validate(schema, data) {
  const errors = {};
  const cleaned = {};

  for (const field in schema) {
    const rules = schema[field];
    let value = data[field];

    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field] = "Campo obbligatorio";
      continue;
    }

    if (!rules.required && value === undefined) {
      cleaned[field] = null;
      continue;
    }

    if (rules.type === "string" && typeof value !== "string") {
      errors[field] = `Deve essere di tipo ${rules.type}`;
      continue;
    }

    if (rules.type === "string") {
      value = value.trim();
      if (rules.required && value === "") {
        errors[field] = "Non può essere vuoto";
        continue;
      }
    }

    cleaned[field] = value ?? null;
  }

  return { errors, cleaned };
}
*/

const projectSchema = {
  project_name: { required: true, type: "string" },
  project_code: { required: true, type: "string" },
  region: { required: true, type: "string" },
  market_segment: { required: true, type: "string" },
  project_phase: { required: true, type: "string" },
  project_status: { required: true, type: "string" },
  notes: { required: true, type: "string" },
  innovation_area: { required: true, type: "string" },
  attachments_link: { required: false, type: "string" },
};

function validate(schema, data) {
  const errors = {};
  const cleaned = {};

  for (const field in schema) {
    const rules = schema[field];
    let value = data[field];

    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field] = "Campo obbligatorio";
      continue;
    }

    if (!rules.required && value === undefined) {
      cleaned[field] = null;
      continue;
    }

    if (rules.type === "string" && typeof value !== "string") {
      errors[field] = `Deve essere di tipo ${rules.type}`;
      continue;
    }

    if (rules.type === "string") {
      value = value.trim();
      if (rules.required && value === "") {
        errors[field] = "Non può essere vuoto";
        continue;
      }
    }

    cleaned[field] = value ?? null;
  }

  return { errors, cleaned };
}

module.exports = { projectSchema, validate };

function fileIdentity(file) {
  if (!file) return null;
  return {
    name: file.name || "",
    size: Number(file.size) || 0,
    type: file.type || "",
    lastModified: Number(file.lastModified) || 0,
  };
}

export function productDraftFingerprint(product) {
  if (!product) return "";
  const { imageFile, ...serializable } = product;
  return JSON.stringify({ ...serializable, imageFile: fileIdentity(imageFile) });
}

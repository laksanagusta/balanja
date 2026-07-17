import React from "react";
import { ProductPhotoField } from "../product/ProductPhotoField.jsx";

export default function ProductPhotoShowcase() {
  const [file, setFile] = React.useState(null);
  const [previewURL, setPreviewURL] = React.useState("");

  React.useEffect(
    () => () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
    },
    [previewURL],
  );

  const select = (next) => {
    setFile(next);
    setPreviewURL(next ? URL.createObjectURL(next) : "");
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Product photo</h3>
      <p className="mb-3 max-w-2xl text-sm leading-6 text-text-muted">
        Field ini menampilkan status foto langsung di baris utama, tanpa caption nama file terpisah, supaya form tetap
        ringkas saat padat.
      </p>
      <div className="rounded-panel border border-border bg-surface p-4">
        <ProductPhotoField
          product={{ category: "Sembako", image: "" }}
          previewURL={previewURL}
          filename={file?.name}
          onSelect={select}
          onRemove={() => select(null)}
        />
      </div>
    </section>
  );
}

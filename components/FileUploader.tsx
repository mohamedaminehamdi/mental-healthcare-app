"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";

import { getFileConfigForType } from "@/lib/file-validation";

const { maxSize, allowedMimeTypes, allowedExtensions } =
  getFileConfigForType("identification");

const accept = Object.fromEntries(
  allowedMimeTypes.map((type) => [
    type,
    allowedExtensions.filter((ext) =>
      type === "application/pdf" ? ext === ".pdf" : ext !== ".pdf"
    ),
  ])
);

type FileUploaderProps = {
  files: File[] | undefined;
  onChange: (files: File[]) => void;
};

export const FileUploader = ({ files, onChange }: FileUploaderProps) => {
  const [error, setError] = useState("");

  const { getRootProps, getInputProps } = useDropzone({
    accept,
    maxSize,
    maxFiles: 1,
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      setError(
        rejections.length
          ? `Please upload a PDF, JPG or PNG under ${maxSize / 1024 / 1024} MB.`
          : ""
      );
      if (acceptedFiles.length) onChange(acceptedFiles);
    },
  });

  const file = files?.[0];
  const previewUrl = useMemo(
    () => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  // Release the object URL when the file changes or the uploader unmounts
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  return (
    <div className="space-y-2">
      <div {...getRootProps()} className="file-upload">
        <input {...getInputProps()} />
        {previewUrl ? (
          <Image
            src={previewUrl}
            width={1000}
            height={1000}
            alt="Uploaded identification document"
            className="max-h-[400px] overflow-hidden object-cover"
          />
        ) : file ? (
          <p className="text-14-regular">{file.name}</p>
        ) : (
          <>
            <Image
              src="/assets/icons/upload.svg"
              width={40}
              height={40}
              alt=""
            />
            <div className="file-upload_label">
              <p className="text-14-regular ">
                <span className="text-green-500">Click to upload </span>
                or drag and drop
              </p>
              <p className="text-12-regular">
                PDF, JPG or PNG (max. {maxSize / 1024 / 1024} MB)
              </p>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="shad-error text-14-regular" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

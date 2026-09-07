import React, { useState } from "react";
import aasulogo from '../assets/aasulogo.png';
import akdphilogo from '../assets/akdphilogo.png';
import casologo from '../assets/casologo.png';
import fsalogo from '../assets/fsalogo.png';
import jsalogo from '../assets/jsalogo.png';
import kasalogo from '../assets/kasalogo.png';
import sasalogo from '../assets/sasalogo.png';
import saselogo from '../assets/saselogo.png';
import vsalogo from '../assets/vsalogo.png';

function Input({ placeholder, id, label, type }: { placeholder: string, id: string, label?: string, type?: "text" | "email" | "password" | "number" }) {
    return (
        <div>
            {label && <label htmlFor={id}>{label}</label>}
            <div className="mt-1 relative">
                <input name={id} id={id} type={type || "text"} placeholder={placeholder} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-mist-400 pr-10" />
            </div>
        </div>
    );
}

const options = ["AKDPhi", "CASO", "FSA", "HEAL", "JSA", "KASA", "LPhiE", "SASA", "SASE", "VSA"];
function Dropdown({ placeholder, id, label}: { placeholder: string, id: string, label?: string}) {
    return (
        <div>
            {label && <label htmlFor={id}>{label}</label>}
            <div className="mt-1 relative">
                <select name={id} id={id} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-mist-400 pr-10" >
                    <option className="text-gray-500" value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

{/*never make me do this again*/}
export interface UploadedFile {
  file: File;
  previewUrl?: string;
}

function FileUploadForm({ onFileSelected }: { onFileSelected: (file: UploadedFile | null) => void }) {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview for images
    const uploadedFile = { file, previewUrl: URL.createObjectURL(file) };
    setSelectedFile(uploadedFile);
    onFileSelected(uploadedFile);
  };

  return (
    <div>
      <label htmlFor="attendance-picture">Attendance Picture</label>
      <input
        id="attendance-picture"
        type="file"
       accept="image/jpeg, image/png, image/gif, application/pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 border border-gray-300 rounded-md p-2 hover:file:bg-blue-100"
      />

      {selectedFile?.previewUrl && (
        <div className="mt-2">
          <img
            src={selectedFile.previewUrl}
            alt="Preview"
            className="w-32 h-32 object-cover rounded border"
          />
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

const eventLogos: Record<string, string> = {
  aasu: aasulogo,
  akdphi: akdphilogo,
  caso: casologo,
  fsa: fsalogo,
  jsa: jsalogo,
  kasa: kasalogo,
  sasa: sasalogo,
  sase: saselogo,
  vsa: vsalogo,
};

function EventLogoPreview({logo}: {logo: string}) {
  let logoSource = eventLogos[logo.toLowerCase()];

  if (!logoSource) {
    logoSource = aasulogo;
  }

    return(
        <div className="flex justify-center">
            <img
            src={logoSource}
            alt={`${logo} logo`}
            className="w-32 h-32 object-contain"
            />
        </div>
    );
}

export default Input;
export { Dropdown };
export { FileUploadForm };
export { EventLogoPreview };
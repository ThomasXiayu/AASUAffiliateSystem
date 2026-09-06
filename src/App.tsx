import Input from './components/input';
import aasulogo from './assets/aasulogo.png';
import { Dropdown } from './components/input';
import { FileUploadForm } from './components/input';
import type { UploadedFile } from './components/input';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { submitForm } from './api';

function App() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [backendReady, setBackendReady] = useState(false);

  //comment all this (warmup functions) out if you wanna test in local
  useEffect(() => {
    let cancelled = false;

    function warmBackend() {
      fetch(`${API_URL}/health`)
        .then((res) => {
          if (!res.ok) throw new Error('not ready');
          if (!cancelled) {
            setBackendReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTimeout(warmBackend, 3000);
          }
        });
    }

    warmBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      alert('Please select an attendance picture before submitting.');
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      await submitForm({
        inputOne: String(formData.get('name') ?? ''),
        inputTwo: String(formData.get('dropdown') ?? ''),
        inputThree: String(formData.get('code') ?? ''),
        image: selectedFile.file,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Submission failed.');
    }
  };

  return (
    <div className="bg-orange-100 font-serif min-h-screen flex flex-col">
      {/*Navbar*/}
      <div className="flex items-center justify-between p-3 bg-red-900 text-white">
        <a className="shrink-0" href="https://hq.fsu.edu/feeds?type=club&type_id=35480&tab=about">
          <img src={aasulogo} className="block h-10 w-10 object-contain" />
        </a>
        <div className="flex gap-2 ml-auto">
          <span className="hover:font-bold cursor-pointer">Home</span>
          <span className="hover:font-bold cursor-pointer">Leaderboard</span>
        </div>
      </div>

      {/* maybe ill put this on the navbar later*/}
      <div className="px-4 pt-4 pb-2 drop-shadow">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-center text-slate-950">AASU Affiliate System</h1>
      </div>

      <div className="w-[calc(100%-2rem)] max-w-xl mx-auto mt-2 p-4 sm:p-6 drop-shadow bg-slate-200 rounded-lg shadow-md border border-gray-200">
        <div className="text-xl md:text-2xl lg:text-3xl font-semibold text-center text-slate-950">Event Attendance Form</div>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {/* put form here */}
          <Input label="Name" id="name" placeholder="Enter your name"/>
          <Dropdown label="Affiliate" id="dropdown" placeholder="Select an affiliate"/>
          <Input label="Event Code" id="code" placeholder="Input event code"/>
          <FileUploadForm onFileSelected={setSelectedFile} />
          <button disabled={!backendReady}
            type="submit"
            className={`w-full ${backendReady ? 'bg-blue-400 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'} text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}>
            {backendReady ? 'Submit' : 'Connecting...'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
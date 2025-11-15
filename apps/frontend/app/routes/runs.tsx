// apps/frontend/app/routes/runs.tsx
import fs from "fs";
import path from "path";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";


interface FilesByDir {
  folder: string;
  files: string[];
}

type FileType = {
  folder: string;
  name: string;
  url: string;
};
//loads Json run files from frontend/public/data/run_data
//seperates the files based on year directory 
export const loader = async () => {
  const dir = path.join(process.cwd(), "public", "data", "run_data");
  if (!fs.existsSync(dir)) return json({ filesByDir: [] });

  const runYears = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const filesByDir: FilesByDir[] = runYears.map((year) => {
    const yearDir = path.join(dir, year);
    const files = fs
      .readdirSync(yearDir)
      .filter((f) => !f.startsWith("."))
      .sort();
    return { folder: year, files };
  });

  return json({ filesByDir });
};

//takes in loader data and sets up states
export default function Runs() {
  const { filesByDir } = useLoaderData<typeof loader>();
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileType[]>([]);

  //checks if folder is already open or different 
  const toggleFolder = (folder: string) => {
    setExpandedFolder(expandedFolder === folder ? null : folder);
  };

  //toggles a file between selected and not selected 
  const toggleFile = (folder: string, filename: string) => {
    const fileObj: FileType = {
      folder,
      name: filename,
      url: `/data/run_data/${folder}/${filename}`,
    };

    const exists = selectedFiles.some(
      (f) => f.folder === folder && f.name === filename
    );

    setSelectedFiles(
      exists
        ? selectedFiles.filter(
            (f) => !(f.folder === folder && f.name === filename)
          )
        : [...selectedFiles, fileObj]
    );
  };
  //used to decide which mode should be active
  const isCompareMode = selectedFiles.length > 1;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Available Runs</h1>

      {filesByDir.map(({ folder, files }) => (
        <div key={folder} className="mb-4">
          <button
            onClick={() => toggleFolder(folder)}
            className="font-semibold text-lg text-left w-full text-gray-800 hover:text-blue-700"
          >
            {folder}
          </button>

          {expandedFolder === folder && (
            <ul className="ml-4 mt-2 space-y-1">
              {files.length === 0 ? (
                <li className="text-gray-500 text-sm">
                  No files in this folder
                </li>
              ) : (
                files.map((f) => {
                  const selected = selectedFiles.some(
                    (file) => file.folder === folder && file.name === f
                  );
                  return (
                    <li key={f}>
                      <button
                        onClick={() => toggleFile(folder, f)}
                        className={`px-2 py-1 rounded transition text-left w-full ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        {f}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      ))}

      {selectedFiles.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2"> {isCompareMode ? "Compare Mode" : "Single File Mode" }</h2>
          <h2 className="text-xl font-bold mb-2"> {isCompareMode ? "Currently Selected Files:" : "Currently Selected File:" }</h2>
          <ul> 
            {selectedFiles.map((f => (<li key={`${f.folder}/${f.name}`}>
              {f.name}
            </li>
            )))}
          </ul>
        </div>
      )}
      </div>)}
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Search, Upload, Trash2, X } from 'lucide-react';

export const Knowledge: React.FC = () => {
  const { kbs } = useApp();
  const [selectedKb, setSelectedKb] = useState<string | null>(null);

  const selectedKbData = kbs.find(kb => kb.id === selectedKb);

  // Mock documents
  const mockDocuments = [
    { id: 'd1', name: 'brand-guidelines.pdf', size: '2.4 MB', type: 'PDF', status: 'synced' },
    { id: 'd2', name: 'tone-of-voice.docx', size: '856 KB', type: 'DOCX', status: 'synced' },
    { id: 'd3', name: 'product-descriptions.txt', size: '124 KB', type: 'TXT', status: 'synced' },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Knowledge Bases</h1>
        <button className="flex items-center gap-2 px-3 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200">
          <Plus size={16} />
          Nova KB
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* KB List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 pl-10 text-sm focus:outline-none focus:border-neutral-700"
            />
          </div>

          {kbs.map(kb => (
            <button
              key={kb.id}
              onClick={() => setSelectedKb(kb.id)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                selectedKb === kb.id
                  ? 'border-white bg-neutral-900'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <p className="font-medium text-sm mb-1">{kb.name}</p>
              <p className="text-xs text-neutral-500 mb-2">{kb.description}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-600">
                <span>{kb.docCount} docs</span>
                <span>{kb.chunkCount} chunks</span>
                <span className={
                  kb.status === 'indexed' ? 'text-green-500' :
                  kb.status === 'indexing' ? 'text-yellow-500' : ''
                }>
                  {kb.status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* KB Details */}
        <div className="col-span-2">
          {selectedKbData ? (
            <div className="rounded-lg border border-neutral-800">
              <div className="p-4 border-b border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-medium">{selectedKbData.name}</h2>
                  <button
                    onClick={() => setSelectedKb(null)}
                    className="p-1 text-neutral-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-sm text-neutral-500 mb-4">{selectedKbData.description}</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-2 rounded bg-neutral-900">
                    <p className="text-lg font-semibold">{selectedKbData.docCount}</p>
                    <p className="text-xs text-neutral-500">Documentos</p>
                  </div>
                  <div className="p-2 rounded bg-neutral-900">
                    <p className="text-lg font-semibold">{selectedKbData.chunkCount}</p>
                    <p className="text-xs text-neutral-500">Chunks</p>
                  </div>
                  <div className="p-2 rounded bg-neutral-900">
                    <p className="text-lg font-semibold capitalize">{selectedKbData.status}</p>
                    <p className="text-xs text-neutral-500">Status</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Documentos</h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-700 rounded hover:bg-neutral-800">
                    <Upload size={14} />
                    Upload
                  </button>
                </div>

                {/* Upload Zone */}
                <div className="mb-4 p-6 rounded border-2 border-dashed border-neutral-800 text-center hover:border-neutral-700 cursor-pointer">
                  <p className="text-sm text-neutral-500">
                    Arraste arquivos ou clique para upload
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">PDF, DOCX, TXT, MD</p>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {mockDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded bg-neutral-900 group"
                    >
                      <div>
                        <p className="text-sm">{doc.name}</p>
                        <p className="text-xs text-neutral-500">
                          {doc.type} - {doc.size}
                        </p>
                      </div>
                      <button className="p-1.5 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center rounded-lg border border-neutral-800 text-neutral-500">
              Selecione uma Knowledge Base
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

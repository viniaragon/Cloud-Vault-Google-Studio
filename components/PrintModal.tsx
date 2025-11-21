import React, { useEffect, useState } from 'react';
import { Printer, Monitor, X, Check, Loader2 } from 'lucide-react';
import { Device } from '../types';
import { getOnlineDevices, sendPrintJob } from '../services/storageService';

interface PrintModalProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

const PrintModal: React.FC<PrintModalProps> = ({ fileUrl, fileName, onClose }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Carrega os PCs online ao abrir o modal
    const loadDevices = async () => {
      const devs = await getOnlineDevices();
      setDevices(devs);
      setLoading(false);
    };
    loadDevices();
  }, []);

  const handlePrint = async () => {
    if (!selectedDevice || !selectedPrinter) return;
    setIsSending(true);
    try {
      await sendPrintJob(fileUrl, selectedDevice, selectedPrinter);
      setSuccess(true);
      setTimeout(onClose, 2000); // Fecha sozinho após 2s
    } catch (error) {
      alert("Erro ao enviar impressão");
      setIsSending(false);
    }
  };

  // Encontra o objeto do dispositivo selecionado para listar suas impressoras
  const currentDevice = devices.find(d => d.id === selectedDevice);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Printer size={20} />
            <h3 className="font-semibold">Imprimir Remotamente</h3>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition"><X size={18}/></button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800 mb-4 truncate">
            Arquivo: <strong>{fileName}</strong>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-emerald-600 animate-in fade-in">
              <div className="bg-emerald-100 p-4 rounded-full mb-3">
                <Check size={40} strokeWidth={3} />
              </div>
              <p className="font-bold text-lg">Enviado com Sucesso!</p>
              <p className="text-sm text-slate-500">A impressora deve reagir em instantes.</p>
            </div>
          ) : (
            <>
              {/* Seleção de PC */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">1. Escolha o Médico (PC)</label>
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={14}/> Buscando médicos online...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {devices.map(dev => (
                      <button
                        key={dev.id}
                        onClick={() => { setSelectedDevice(dev.id); setSelectedPrinter(''); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${selectedDevice === dev.id 
                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                            : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className={`p-2 rounded-lg ${selectedDevice === dev.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          <Monitor size={18} />
                        </div>
                        <div>
                           <p className="font-medium text-slate-800 text-sm">{dev.name}</p>
                           <p className="text-xs text-emerald-600 flex items-center gap-1">● Online</p>
                        </div>
                      </button>
                    ))}
                    {devices.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum PC online encontrado.</p>}
                  </div>
                )}
              </div>

              {/* Seleção de Impressora */}
              {selectedDevice && currentDevice && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">2. Escolha a Impressora</label>
                  <select 
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {currentDevice.impressoras.map(imp => (
                      <option key={imp} value={imp}>{imp}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botão de Ação */}
              <button
                onClick={handlePrint}
                disabled={!selectedDevice || !selectedPrinter || isSending}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isSending ? <Loader2 className="animate-spin" /> : <Printer size={18} />}
                {isSending ? 'Enviando...' : 'Imprimir Agora'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
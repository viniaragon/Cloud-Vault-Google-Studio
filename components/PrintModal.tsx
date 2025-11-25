import React, { useEffect, useState } from 'react';
import { Printer, Monitor, X, Check, Loader2, Trash2 } from 'lucide-react'; 
import { Device } from '../types';
import { getOnlineDevices, sendPrintJob, deleteDevice } from '../services/storageService'; 

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

  // Função para carregar a lista
  const loadDevices = async () => {
    setLoading(true);
    const devs = await getOnlineDevices();
    setDevices(devs);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handlePrint = async () => {
    if (!selectedDevice || !selectedPrinter) return;
    setIsSending(true);
    try {
      await sendPrintJob(fileUrl, selectedDevice, selectedPrinter);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      alert("Erro ao enviar impressão");
      setIsSending(false);
    }
  };

  // Função: Deletar PC
const handleDeleteDevice = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); 
    
    // REMOVI O "if (confirm(...))" POIS O SEU NAVEGADOR ESTÁ BLOQUEANDO
    try {
      await deleteDevice(id);
      
      // Remove da lista visualmente
      setDevices(prev => prev.filter(d => d.id !== id));
      
      // Se o deletado estava selecionado, limpa a seleção
      if (selectedDevice === id) {
          setSelectedDevice('');
          setSelectedPrinter('');
      }
    } catch (error) {
      console.error("Erro ao deletar:", error); // Mudei de alert para console.error
    }
  };

  const currentDevice = devices.find(d => d.id === selectedDevice);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Printer size={20} />
            <h3 className="font-semibold">Imprimir Remotamente</h3>
          </div>
          <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded-full transition"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm text-emerald-800 mb-4 truncate">
            Arquivo: <strong>{fileName}</strong>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-emerald-600 animate-in fade-in">
              <div className="bg-emerald-100 p-4 rounded-full mb-3">
                <Check size={40} strokeWidth={3} />
              </div>
              <p className="font-bold text-lg">Enviado com Sucesso!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">1. Escolha o Médico (PC)</label>
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={14}/> Buscando médicos...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {devices.map(dev => {
                      const isOnline = dev.status === 'online';
                      
                      return (
                        <div 
                          key={dev.id}
                          onClick={() => { 
                            // Só permite selecionar se estiver ONLINE
                            if (isOnline) {
                                setSelectedDevice(dev.id); 
                                setSelectedPrinter('');
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all group relative
                            ${selectedDevice === dev.id 
                              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' // Selecionado
                              : isOnline 
                                ? 'border-slate-200 hover:bg-slate-50 cursor-pointer' // Online
                                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' // Offline (Cinza)
                            }`}
                        >
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                selectedDevice === dev.id ? 'bg-emerald-200 text-emerald-700' : 
                                isOnline ? 'bg-slate-100 text-slate-500' : 'bg-slate-200 text-slate-400'
                              }`}>
                                <Monitor size={18} />
                              </div>
                              <div>
                                  <p className={`font-medium text-sm ${isOnline ? 'text-slate-800' : 'text-slate-500'}`}>
                                      {dev.name}
                                  </p>
                                  <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                                      ● {isOnline ? 'Online' : 'Offline'}
                                  </p>
                              </div>
                          </div>

                          {/* BOTÃO DE LIXEIRA */}
                          <button
                              onClick={(e) => handleDeleteDevice(e, dev.id, dev.name)}
                              className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                              title="Remover este PC da lista"
                          >
                              <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                    {devices.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Nenhum PC encontrado.</p>}
                  </div>
                )}
              </div>

              {selectedDevice && currentDevice && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">2. Escolha a Impressora</label>
                  <select 
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {currentDevice.impressoras.map(imp => (
                      <option key={imp} value={imp}>{imp}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handlePrint}
                disabled={!selectedDevice || !selectedPrinter || isSending}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
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
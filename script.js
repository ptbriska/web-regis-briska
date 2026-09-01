// =========================================================================
// CONFIGURATION
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2MPM2sFzYOggxYdwLHhfglOCCTz4Reu8cYh5IsbxmHj6MYaPBXDYO0jpCYSXyxeI6/exec";
const EVENT_LIST_URL = "./event_list.txt";

// Pemetaan Relasional Event -> Array Bidang
let eventDataMap = {};

// =========================================================================
// 1. GOOGLE IDENTITY SERVICES (JWT PARSER & CALLBACK)
// =========================================================================

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Gagal mendekode token JWT Google:", e);
    return null;
  }
}

function handleCredentialResponse(response) {
  const data = parseJwt(response.credential);
  if (!data || !data.email) {
    alert("Gagal memverifikasi akun Google. Silakan coba lagi.");
    return;
  }

  document.getElementById("email").value = data.email;
  document.getElementById("verifiedEmailText").innerText = data.email;
  if (data.name && !document.getElementById("nama_lengkap").value) {
    document.getElementById("nama_lengkap").value = data.name;
  }

  document.getElementById("loginGuard").classList.add("hidden");
  document.getElementById("registrationForm").classList.remove("hidden");
}

// =========================================================================
// 2. DYNAMIC FORM LOGIC, EVENT & BIDANG LOADER, SUBMISSION
// =========================================================================

document.addEventListener("DOMContentLoaded", function() {
  const selectEvent = document.getElementById("kode_kegiatan");
  const selectBidang = document.getElementById("bidang_kegiatan");
  const jalurSelect = document.getElementById("jalur_daftar");
  const infoKolektif = document.getElementById("infoKolektif");
  
  const secBayar = document.getElementById("secBayar");
  const secKtp = document.getElementById("secKtp");
  const secIdentitasSpesifik = document.getElementById("secIdentitasSpesifik");
  const secMedsos = document.getElementById("secMedsos");

  const inputBayar = document.getElementById("bukti_bayar");
  const inputKtp = document.getElementById("bukti_ktp");
  const inputIdentitasSpesifik = document.getElementById("bukti_identitas_spesifik");
  
  const inputFollowKelasbisa = document.getElementById("bukti_follow_kelasbisa");
  const inputFollowPelaksana = document.getElementById("bukti_follow_pelaksana");
  const inputKomenTag = document.getElementById("bukti_komen_tag");
  const inputShareWaTele = document.getElementById("bukti_share_wa_tele");
  const inputShareStory = document.getElementById("bukti_share_story");

  const allFileInputs = [
    inputBayar, inputKtp, inputIdentitasSpesifik,
    inputFollowKelasbisa, inputFollowPelaksana, inputKomenTag,
    inputShareWaTele, inputShareStory
  ];

  // -----------------------------------------------------------------------
  // A. PARSING & AUTO-POPULATE DARI FILE event_list.txt
  // -----------------------------------------------------------------------
  async function loadEventAndBidangData() {
    if (!selectEvent || !selectBidang) return;

    try {
      const response = await fetch(EVENT_LIST_URL + "?t=" + new Date().getTime());
      if (!response.ok) throw new Error("File event_list.txt tidak ditemukan.");

      const textData = await response.text();
      const lines = textData.split("\n").map(l => l.trim()).filter(l => l.length > 0);

      eventDataMap = {};
      selectEvent.innerHTML = '<option value="">-- Pilih Event / Kegiatan --</option>';
      selectBidang.innerHTML = '<option value="">-- Pilih Event Terlebih Dahulu --</option>';
      selectBidang.disabled = true;

      if (lines.length === 0) {
        selectEvent.innerHTML = '<option value="">-- Pendaftaran Sedang Ditutup --</option>';
        selectEvent.disabled = true;
        return;
      }

      selectEvent.disabled = false;

      lines.forEach(line => {
        // Parsing Format: KODE_EVENT : BIDANG_1, BIDANG_2
        const parts = line.split(":");
        const kodeEvent = parts[0].trim().toUpperCase();
        
        let bidangList = [];
        if (parts.length > 1 && parts[1].trim() !== "") {
          bidangList = parts[1].split(",").map(b => b.trim()).filter(b => b.length > 0);
        } else {
          bidangList = ["Umum / Semua Bidang"];
        }

        eventDataMap[kodeEvent] = bidangList;

        const opt = document.createElement("option");
        opt.value = kodeEvent;
        opt.textContent = kodeEvent;
        selectEvent.appendChild(opt);
      });

    } catch (err) {
      console.error("Gagal memuat event:", err);
      selectEvent.innerHTML = '<option value="">-- Gagal Memuat Daftar Event --</option>';
    }
  }

  // Listener Pilihan Kode Event -> Mengisi Pilihan Bidang Sesuai Event
  if (selectEvent) {
    selectEvent.addEventListener("change", function() {
      const selectedEvent = this.value;
      selectBidang.innerHTML = "";

      if (!selectedEvent || !eventDataMap[selectedEvent]) {
        selectBidang.innerHTML = '<option value="">-- Pilih Event Terlebih Dahulu --</option>';
        selectBidang.disabled = true;
        return;
      }

      const availableBidang = eventDataMap[selectedEvent];
      selectBidang.innerHTML = '<option value="">-- Pilih Bidang / Kategori --</option>';

      availableBidang.forEach(bidang => {
        const opt = document.createElement("option");
        opt.value = bidang;
        opt.textContent = bidang;
        selectBidang.appendChild(opt);
      });

      selectBidang.disabled = false;
    });
  }

  loadEventAndBidangData();

  // -----------------------------------------------------------------------
  // B. DYNAMIC TOGGLE UPLOAD SECTIONS
  // -----------------------------------------------------------------------
  function resetAllSections() {
    if (infoKolektif) infoKolektif.classList.add("hidden");
    if (secBayar) secBayar.classList.add("hidden");
    if (secKtp) secKtp.classList.add("hidden");
    if (secIdentitasSpesifik) secIdentitasSpesifik.classList.add("hidden");
    if (secMedsos) secMedsos.classList.add("hidden");

    allFileInputs.forEach(input => {
      if (input) {
        input.value = "";
        input.required = false;
        input.disabled = true;
      }
    });
  }

  function activateInputs(inputsArray) {
    inputsArray.forEach(input => {
      if (input) {
        input.disabled = false;
        input.required = true;
      }
    });
  }

  jalurSelect.addEventListener("change", function() {
    const v = this.value;
    resetAllSections();

    if (["normal", "kolektif", "alumni", "early_bird"].includes(v)) {
      if (secBayar) secBayar.classList.remove("hidden");
      activateInputs([inputBayar]);
      if (v === "kolektif" && infoKolektif) infoKolektif.classList.remove("hidden");
    } 
    else if (v === "riau_sulsel") {
      if (secBayar) secBayar.classList.remove("hidden");
      if (secKtp) secKtp.classList.remove("hidden");
      activateInputs([inputBayar, inputKtp]);
    } 
    else if (v === "profesi") {
      if (secBayar) secBayar.classList.remove("hidden");
      if (secIdentitasSpesifik) secIdentitasSpesifik.classList.remove("hidden");
      activateInputs([inputBayar, inputIdentitasSpesifik]);
    } 
    else if (v === "bersyarat") {
      // Tarif Bersyarat (Medsos): Bukti Bayar + 5 Berkas Medsos
      if (secBayar) secBayar.classList.remove("hidden");
      if (secMedsos) secMedsos.classList.remove("hidden");
      activateInputs([
        inputBayar,
        inputFollowKelasbisa, inputFollowPelaksana,
        inputKomenTag, inputShareWaTele, inputShareStory
      ]);
    } 
    else if (v === "freemium") {
      // Tarif Freemium: Hanya 5 Berkas Medsos
      if (secMedsos) secMedsos.classList.remove("hidden");
      activateInputs([
        inputFollowKelasbisa, inputFollowPelaksana,
        inputKomenTag, inputShareWaTele, inputShareStory
      ]);
    }
    else if (v === "daerah_3t") {
      if (secKtp) secKtp.classList.remove("hidden");
      activateInputs([inputKtp]);
    }
  });

  // -----------------------------------------------------------------------
  // C. SUBMIT HANDLER & PAYLOAD PROCESSOR
  // -----------------------------------------------------------------------
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ base64: reader.result, name: file.name });
    reader.onerror = (err) => reject(err);
  });

  const form = document.getElementById("registrationForm");
  const btnSubmit = document.getElementById("btnSubmit");
  const responseMessage = document.getElementById("responseMessage");
  const successPage = document.getElementById("successPage");
  const formHeader = document.getElementById("formHeader");

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = "<span>Sedang Mengirim Data... (Proses Upload)</span>";
    if (responseMessage) responseMessage.className = "hidden";

    try {
      const MAX_SIZE = 2 * 1024 * 1024; // Limit 2MB

      const processFile = async (inputEl, labelName) => {
        if (inputEl && !inputEl.disabled && inputEl.files && inputEl.files.length > 0) {
          const f = inputEl.files[0];
          if (f.size > MAX_SIZE) throw new Error(`File ${labelName} melebihi 2MB!`);
          return await fileToBase64(f);
        }
        return null;
      };

      const kodeKegiatanVal = selectEvent.value ? selectEvent.value.toUpperCase().trim() : "";
      const bidangKegiatanVal = selectBidang.value ? selectBidang.value.trim() : "-";

      if (!kodeKegiatanVal) {
        throw new Error("Silakan pilih Event / Kegiatan terlebih dahulu.");
      }
      if (!bidangKegiatanVal || bidangKegiatanVal.includes("-- Pilih")) {
        throw new Error("Silakan pilih Bidang / Kategori terlebih dahulu.");
      }

      const payload = {
        kode_kegiatan: kodeKegiatanVal,
        bidang_kegiatan: bidangKegiatanVal,
        jalur_daftar: jalurSelect.options[jalurSelect.selectedIndex].text,
        nama_lengkap: document.getElementById("nama_lengkap").value.trim(),
        nomor_hp: document.getElementById("nomor_hp").value.trim(),
        email: document.getElementById("email").value.trim(),
        jenis_kelamin: document.getElementById("jenis_kelamin").value,
        asal_instansi: document.getElementById("asal_instansi").value.trim(),
        pekerjaan_jurusan: document.getElementById("pekerjaan_jurusan").value.trim(),
        nomor_identitas: document.getElementById("nomor_identitas").value.trim(),
        asal_kabupaten: document.getElementById("asal_kabupaten").value.trim(),
        asal_provinsi: document.getElementById("asal_provinsi").value,
        persetujuan_iklan: document.getElementById("persetujuan_iklan").value,

        file_bayar: await processFile(inputBayar, "Bukti Bayar"),
        file_ktp: await processFile(inputKtp, "KTP"),
        file_identitas_spesifik: await processFile(inputIdentitasSpesifik, "Identitas Spesifik"),
        file_follow_kelasbisa: await processFile(inputFollowKelasbisa, "Follow @kelasbisaid"),
        file_follow_pelaksana: await processFile(inputFollowPelaksana, "Follow Pelaksana"),
        file_komen_tag: await processFile(inputKomenTag, "Komen Tag 10 Teman"),
        file_share_wa_tele: await processFile(inputShareWaTele, "Share WA/Telegram"),
        file_share_story: await processFile(inputShareStory, "Share Story")
      };

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "text/plain;charset=utf-8" 
        },
        body: JSON.stringify(payload)
      });

      const resultData = await response.json();

      if (resultData.result === "success") {
        form.classList.add("hidden");
        if (formHeader) formHeader.classList.add("hidden");
        if (successPage) successPage.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(resultData.message || "Gagal menyimpan di sistem database Google.");
      }

    } catch (err) {
      console.error(err);
      if (responseMessage) {
        responseMessage.className = "msg-error";
        responseMessage.innerText = "ERROR: " + (err.message || "Gagal mengirim data.");
        responseMessage.classList.remove("hidden");
      } else {
        alert("ERROR: " + err.message);
      }
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = "<span>Kirim Pendaftaran</span>";
    }
  });
});

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import QRCodeStyling from "qr-code-styling";
import { ColorPickerField } from "@/components/ui/color-picker-field";
import { SpiralDemo } from "@/components/ui/demo";
import { Waves } from "@/components/ui/wave-background";
import { decryptFileInBrowser, encryptFileInBrowser } from "@/lib/browser-file-crypto";

const QrToolLogo = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3.5" y="3.5" width="6" height="6" rx="1.25" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1.25" />
    <rect x="3.5" y="14.5" width="6" height="6" rx="1.25" />
    <rect x="6" y="6" width="1" height="1" fill="currentColor" stroke="none" />
    <rect x="17" y="6" width="1" height="1" fill="currentColor" stroke="none" />
    <rect x="6" y="17" width="1" height="1" fill="currentColor" stroke="none" />
    <rect x="14.5" y="14.5" width="2.25" height="2.25" rx="0.4" fill="currentColor" stroke="none" />
    <rect x="18.25" y="14.5" width="2.25" height="2.25" rx="0.4" fill="currentColor" stroke="none" />
    <rect x="14.5" y="18.25" width="2.25" height="2.25" rx="0.4" fill="currentColor" stroke="none" />
    <path d="M18.25 18.25h2.25v2.25" />
  </svg>
);

const BarcodeToolLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4" width="1.5" height="16" rx="0.75" fill="currentColor" />
    <rect x="5.5" y="4" width="2.25" height="16" rx="0.85" fill="currentColor" />
    <rect x="9" y="4" width="1" height="16" rx="0.5" fill="currentColor" />
    <rect x="11" y="4" width="2.75" height="16" rx="0.95" fill="currentColor" />
    <rect x="15" y="4" width="1.4" height="16" rx="0.7" fill="currentColor" />
    <rect x="17.35" y="4" width="3.15" height="16" rx="1" fill="currentColor" />
  </svg>
);

const BWIP_JS_URL = "https://cdn.jsdelivr.net/npm/bwip-js@4.5.2/dist/bwip-js-min.js";
const TABS = [
  { id: "secure", label: "Secure Link" },
  { id: "qr", label: "QR Generator" },
  { id: "barcode", label: "Barcode Generator" },
];
const TIME_SEGMENT_OPTIONS = Array.from({ length: 60 }, (_, index) => index);
const QR_LEVELS = ["L", "M", "Q", "H"];
const QR_EDITOR_MODES = [
  { id: "single", label: "Single" },
  { id: "vcard", label: "vCard Builder" },
  { id: "batch", label: "Batch Mode" },
];
const BARCODE_EDITOR_MODES = [
  { id: "single", label: "Single" },
  { id: "batch", label: "Batch Mode" },
];
const QR_CONTENT_TEMPLATES = [
  { id: "url", label: "URL", value: "https://example.com/share/secure-file" },
  { id: "email", label: "Email", value: "mailto:hello@example.com?subject=Secure%20File&body=Download%20your%20file" },
  { id: "phone", label: "Phone", value: "tel:+15551234567" },
  { id: "wifi", label: "WiFi", value: "WIFI:T:WPA;S:OfficeNet;P:super-secure-password;;" },
  { id: "sms", label: "SMS", value: "SMSTO:+15551234567:Your secure file is ready." },
  { id: "geo", label: "Geo", value: "geo:37.7749,-122.4194" },
];
const QR_DOT_TYPES = [
  { id: "square", label: "Boxy" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy Round" },
  { id: "extra-rounded", label: "Soft" },
];
const QR_CORNER_TYPES = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "dot", label: "Dot" },
  { id: "extra-rounded", label: "Soft" },
  { id: "classy", label: "Classy" },
];
const QR_STYLE_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    foreground: "#0f2214",
    background: "#fbf7ec",
    cornerColor: "#0f2214",
    cornerDotColor: "#0f2214",
    dotType: "square",
    cornerType: "square",
    cornerDotType: "square",
    shape: "square",
    level: "M",
  },
  {
    id: "rounded",
    label: "Rounded",
    foreground: "#1f6a34",
    background: "#fbf7ec",
    cornerColor: "#1f6a34",
    cornerDotColor: "#163f1e",
    dotType: "rounded",
    cornerType: "extra-rounded",
    cornerDotType: "dot",
    shape: "square",
    level: "M",
  },
  {
    id: "dots",
    label: "Dots",
    foreground: "#286f2f",
    background: "#fcf8ee",
    cornerColor: "#286f2f",
    cornerDotColor: "#286f2f",
    dotType: "dots",
    cornerType: "dots",
    cornerDotType: "dot",
    shape: "square",
    level: "Q",
  },
  {
    id: "classy",
    label: "Classy",
    foreground: "#224b37",
    background: "#f8f3e7",
    cornerColor: "#224b37",
    cornerDotColor: "#10251a",
    dotType: "classy",
    cornerType: "classy",
    cornerDotType: "classy",
    shape: "square",
    level: "Q",
  },
  {
    id: "indigo",
    label: "Indigo",
    foreground: "#213d6f",
    background: "#f4f6fb",
    cornerColor: "#213d6f",
    cornerDotColor: "#122540",
    dotType: "rounded",
    cornerType: "rounded",
    cornerDotType: "rounded",
    shape: "square",
    level: "H",
  },
  {
    id: "rose",
    label: "Rose",
    foreground: "#8a3f52",
    background: "#fdf4f5",
    cornerColor: "#8a3f52",
    cornerDotColor: "#5e2534",
    dotType: "classy-rounded",
    cornerType: "extra-rounded",
    cornerDotType: "rounded",
    shape: "square",
    level: "Q",
  },
  {
    id: "teal",
    label: "Teal",
    foreground: "#0f6d68",
    background: "#eff9f7",
    cornerColor: "#0f6d68",
    cornerDotColor: "#0b4f4b",
    dotType: "rounded",
    cornerType: "rounded",
    cornerDotType: "dot",
    shape: "circle",
    level: "H",
  },
];
const BARCODE_TYPES = [
  ["microqrcode", "Micro QR", "Short payload or compact token", "Compact 2D code for very short payloads and constrained spaces."],
  ["datamatrix", "Data Matrix", "Product ID or serial number", "Dense matrix code used on labels, healthcare, and small industrial parts."],
  ["azteccode", "Aztec Code", "Ticket or pass data", "Strong 2D code for tickets, boarding passes, and mobile scanners."],
  ["pdf417", "PDF417", "Long-form encoded text", "Stacked code for IDs, manifests, shipping docs, and offline records."],
  ["code128", "Code 128", "General label text", "Flexible linear barcode for logistics, inventory, and warehouse labels."],
  ["code39", "Code 39", "Uppercase letters and digits", "Classic industrial barcode for part numbers and internal tracking."],
  ["ean13", "EAN-13", "12 or 13 digits", "Retail barcode standard used on packaged consumer products."],
  ["upca", "UPC-A", "11 or 12 digits", "North American retail barcode standard."],
].map(([value, label, placeholder, note]) => ({ value, label, placeholder, note }));

const EMPTY_VCARD = {
  firstName: "",
  lastName: "",
  company: "",
  title: "",
  phone: "",
  email: "",
  website: "",
  address: "",
};

let bwipLoaderPromise = null;

const loadBwipJs = () => {
  if (window.bwipjs) {
    return Promise.resolve(window.bwipjs);
  }

  if (!bwipLoaderPromise) {
    bwipLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("bwip-js-cdn");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.bwipjs), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load bwip-js.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.id = "bwip-js-cdn";
      script.src = BWIP_JS_URL;
      script.async = true;
      script.onload = () => resolve(window.bwipjs);
      script.onerror = () => reject(new Error("Failed to load bwip-js."));
      document.head.appendChild(script);
    }).catch((error) => {
      bwipLoaderPromise = null;
      throw error;
    });
  }

  return bwipLoaderPromise;
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = seconds / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}m`;
  }
  const hours = seconds / 3600;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
};

const formatLongDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return "";
  const { hours, minutes, seconds: remainder } = getDurationParts(seconds);
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (remainder || !parts.length) parts.push(`${remainder}s`);

  return parts.join(" ");
};

const padTimeUnit = (value) => String(value).padStart(2, "0");

const getDurationParts = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return {
    hours: Math.floor(safeSeconds / 3600),
    minutes: Math.floor((safeSeconds % 3600) / 60),
    seconds: safeSeconds % 60,
  };
};

const formatTimerValue = (seconds) => {
  const { hours, minutes, seconds: remainder } = getDurationParts(seconds);
  return [hours, minutes, remainder].map(padTimeUnit).join(":");
};

const getSecondsRemaining = (expiresAt) => {
  const expiresAtTimestamp = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtTimestamp)) return 0;
  return Math.max(0, Math.ceil((expiresAtTimestamp - Date.now()) / 1000));
};

const renderToolTabLogo = (tabId, className) => {
  if (tabId === "qr") {
    return <QrToolLogo className={className} />;
  }

  if (tabId === "barcode") {
    return <BarcodeToolLogo className={className} />;
  }

  return null;
};

const stripHash = (value) => value.replace(/^#/, "");

const escapeVCardValue = (value) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

const buildVCard = (contact) => {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  const hasContent = Object.values(contact).some((value) => value.trim());
  if (!hasContent) return "";

  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (contact.firstName || contact.lastName) {
    lines.push(
      `N:${escapeVCardValue(contact.lastName)};${escapeVCardValue(contact.firstName)};;;`,
    );
  }
  if (fullName) lines.push(`FN:${escapeVCardValue(fullName)}`);
  if (contact.company) lines.push(`ORG:${escapeVCardValue(contact.company)}`);
  if (contact.title) lines.push(`TITLE:${escapeVCardValue(contact.title)}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.phone)}`);
  if (contact.email) lines.push(`EMAIL:${escapeVCardValue(contact.email)}`);
  if (contact.website) lines.push(`URL:${escapeVCardValue(contact.website)}`);
  if (contact.address) lines.push(`ADR:;;${escapeVCardValue(contact.address)};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
};

const splitBatchItems = (value) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const getQrEmptyMessage = (mode) => {
  if (mode === "vcard") return "Fill in at least one vCard field to generate a QR code.";
  if (mode === "batch") return "Enter one item per line to preview batch QR codes.";
  return "Enter content to generate QR code.";
};

const getBarcodeEmptyMessage = (label, mode) => {
  if (mode === "batch") return `Enter one value per line to preview batch ${label} codes.`;
  return `Enter content to generate ${label}.`;
};

const triggerDownload = (href, filename) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const copyBlobToClipboard = async (blob) => {
  if (!navigator.clipboard?.write || typeof window.ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }
  await navigator.clipboard.write([
    new window.ClipboardItem({
      "image/png": Promise.resolve(blob),
    }),
  ]);
};

const downloadSvg = (markup, filename) => {
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), filename);
};

const resolveExportDimensions = (sourceWidth, sourceHeight, targetWidth, padding = 0) => {
  const innerWidth = Math.max(sourceWidth, targetWidth);
  const innerHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * innerWidth));
  const safePadding = Math.max(0, Math.floor(padding));

  return {
    innerWidth,
    innerHeight,
    outputWidth: innerWidth + safePadding * 2,
    outputHeight: innerHeight + safePadding * 2,
    offsetX: safePadding,
    offsetY: safePadding,
  };
};

const canvasToPngBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });

const ensureSvgMarkup = (markup) => {
  let normalizedMarkup = markup.trim();

  if (!normalizedMarkup.includes("xmlns=")) {
    normalizedMarkup = normalizedMarkup.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }

  return normalizedMarkup;
};

const markupToPngBlob = (
  markup,
  targetWidth,
  { backgroundColor = "#ffffff", padding = 0 } = {},
) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([ensureSvgMarkup(markup)], { type: "image/svg+xml;charset=utf-8" }),
    );
    const image = new Image();

    image.onload = () => {
      const { innerWidth, innerHeight, outputWidth, outputHeight, offsetX, offsetY } =
        resolveExportDimensions(image.width, image.height, targetWidth, padding);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas is not available."));
        return;
      }

      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, outputWidth, outputHeight);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, offsetX, offsetY, innerWidth, innerHeight);
      canvasToPngBlob(canvas)
        .then((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        })
        .catch((error) => {
          URL.revokeObjectURL(url);
          reject(error);
        });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PNG export failed."));
    };

    image.src = url;
  });

const canvasElementToPngBlob = (
  canvasElement,
  targetWidth,
  { backgroundColor = "#ffffff", padding = 0 } = {},
) => {
  if (!canvasElement) {
    return Promise.reject(new Error("QR preview is not ready."));
  }

  const sourceWidth = canvasElement.width || Math.round(canvasElement.getBoundingClientRect().width) || 1;
  const sourceHeight =
    canvasElement.height || Math.round(canvasElement.getBoundingClientRect().height) || sourceWidth;
  const { innerWidth, innerHeight, outputWidth, outputHeight, offsetX, offsetY } =
    resolveExportDimensions(sourceWidth, sourceHeight, targetWidth, padding);
  const outputCanvas = document.createElement("canvas");

  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;

  const context = outputCanvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Canvas is not available."));
  }

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(canvasElement, offsetX, offsetY, innerWidth, innerHeight);

  return canvasToPngBlob(outputCanvas);
};

const svgElementToPngBlob = (
  svgElement,
  targetWidth,
  { backgroundColor = "#ffffff", padding = 0 } = {},
) => {
  if (!svgElement) {
    return Promise.reject(new Error("QR preview is not ready."));
  }

  const markup = new XMLSerializer().serializeToString(svgElement);
  const fallbackWidth =
    Number(svgElement.getAttribute("width")) ||
    svgElement.viewBox?.baseVal?.width ||
    Math.round(svgElement.getBoundingClientRect().width) ||
    220;

  return markupToPngBlob(markup, targetWidth || fallbackWidth, { backgroundColor, padding });
};

const downloadPng = async (markup, filename, targetWidth) => {
  const blob = await markupToPngBlob(markup, targetWidth);
  downloadBlob(blob, filename);
};

const exportQrBlob = async (qrCode, extension) => {
  if (!qrCode) {
    throw new Error("QR preview is not ready.");
  }

  const raw = await qrCode.getRawData(extension);
  if (!raw) {
    throw new Error("QR export failed.");
  }

  if (raw instanceof Blob) {
    return raw;
  }

  return new Blob([raw], {
    type: extension === "svg" ? "image/svg+xml;charset=utf-8" : `image/${extension}`,
  });
};

const getCurrentRoutePath = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.hash.replace(/^#/, "") || "/";
};

const getShareTokenFromRoute = (routePath) => {
  const match = routePath.match(/^\/share\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const buildShareLink = (shareToken) => {
  if (typeof window === "undefined") {
    return `#/share/${shareToken}`;
  }

  const url = new URL(window.location.href);
  url.hash = `/share/${shareToken}`;
  return url.toString();
};

function DropdownSelect({ label, value, options, onChange, formatValue = (option) => option }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectedValue = String(value);

  return (
    <div className={`timer-unit select-menu ${open ? "is-open" : ""}`} ref={rootRef}>
      <span>{label}</span>
      <button
        className="select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{formatValue(Number(value))}</strong>
        <span className="select-trigger__caret" aria-hidden="true" />
      </button>
      {open ? (
        <div className="select-menu__list" role="listbox" aria-label={label}>
          {options.map((option) => {
            const optionValue = String(option);
            const selected = optionValue === selectedValue;

            return (
              <button
                key={optionValue}
                className={`select-menu__option ${selected ? "is-selected" : ""}`}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
              >
                {formatValue(option)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SharePage({ apiBaseUrl, shareToken }) {
  const [transfer, setTransfer] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  useEffect(() => {
    let active = true;

    const loadTransfer = async () => {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch(`${apiBaseUrl}/api/files/${shareToken}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message ?? "This file is unavailable.");
        }

        if (!active) return;
        setTransfer(payload);
        setDownloadError("");
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setTransfer(null);
        setStatus("error");
        setErrorMessage(error.message || "This file is unavailable.");
      }
    };

    loadTransfer();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, shareToken]);

  useEffect(() => {
    if (!transfer?.expiresAt) {
      setRemainingSeconds(null);
      return undefined;
    }

    const syncRemainingTime = () => {
      setRemainingSeconds(getSecondsRemaining(transfer.expiresAt));
    };

    syncRemainingTime();
    const interval = window.setInterval(syncRemainingTime, 1000);
    return () => window.clearInterval(interval);
  }, [transfer?.expiresAt]);

  const transferExpired = status === "ready" && remainingSeconds !== null && remainingSeconds <= 0;
  const usesBrowserDecryption = Boolean(
    transfer?.deliveryMode === "client-decrypt" &&
      transfer?.encryptedDownloadUrl &&
      transfer?.encryptionKey,
  );

  const handleDownload = async () => {
    if (!transfer || transferExpired) {
      return;
    }

    if (!usesBrowserDecryption) {
      window.open(transfer.downloadLink, "_blank", "noopener,noreferrer");
      return;
    }

    setIsDownloading(true);
    setDownloadError("");

    try {
      const metadataResponse = await fetch(`${apiBaseUrl}/api/files/${shareToken}`);
      const metadata = await metadataResponse.json().catch(() => ({}));

      if (!metadataResponse.ok) {
        throw new Error(metadata.message ?? "This file is unavailable.");
      }

      setTransfer(metadata);

      const downloadResponse = await fetch(metadata.encryptedDownloadUrl);
      if (!downloadResponse.ok) {
        throw new Error("Encrypted file download failed.");
      }

      const encryptedBlob = await downloadResponse.blob();
      const decryptedBlob = await decryptFileInBrowser(
        encryptedBlob,
        metadata.encryptionKey,
        metadata.contentType,
      );

      downloadBlob(decryptedBlob, metadata.filename);
      fetch(`${apiBaseUrl}/api/files/${shareToken}/downloaded`, { method: "POST" }).catch(() => undefined);
    } catch (error) {
      setDownloadError(error.message || "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="share-page">
      <div className="panel share-card">
        <div className="share-header">
          <p className="panel-kicker">Shared file</p>
          <h1>
            {status === "loading"
              ? "Preparing your download"
              : status === "error"
                ? "Link unavailable"
                : transferExpired
                  ? "Link expired"
                  : "File ready to download"}
          </h1>
          <p className="share-subtitle">
            Open the file details below, then download the file securely.
          </p>
        </div>

        {status === "loading" ? (
          <div className="share-status-card">
            <strong>Checking file detailsâ€¦</strong>
            <p>Fetching the file name, expiry, and download info.</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="share-status-card is-error">
            <strong>{errorMessage}</strong>
            <p>This share link may be expired, deleted, or unavailable.</p>
          </div>
        ) : null}

        {status === "ready" && transfer ? (
          <>
            <div className={`share-status-card ${transferExpired ? "is-error" : ""}`}>
              <span className="share-status-label">
                {transferExpired ? "Expired" : "Time remaining"}
              </span>
              <strong>{transferExpired ? "00:00:00" : formatTimerValue(remainingSeconds ?? 0)}</strong>
              <p>
                {transferExpired
                  ? "This file can no longer be downloaded."
                  : `Expires ${formatDateTime(transfer.expiresAt)}`}
              </p>
            </div>

            <div className="share-details">
              <article className="share-detail-card">
                <span>File</span>
                <strong>{transfer.filename}</strong>
              </article>
              <article className="share-detail-card">
                <span>Original size</span>
                <strong>{formatBytes(transfer.fileSize)}</strong>
              </article>
              <article className="share-detail-card">
                <span>Encrypted size</span>
                <strong>{formatBytes(transfer.encryptedSize)}</strong>
              </article>
              <article className="share-detail-card">
                <span>Type</span>
                <strong>{transfer.contentType || "Unknown"}</strong>
              </article>
              <article className="share-detail-card">
                <span>Uploaded</span>
                <strong>{formatDateTime(transfer.createdAt)}</strong>
              </article>
              <article className="share-detail-card">
                <span>Expires</span>
                <strong>{formatDateTime(transfer.expiresAt)}</strong>
              </article>
            </div>

            <div className="share-actions">
              {transferExpired ? (
                <span className="primary-button button-disabled button-disabled-primary" aria-disabled="true">
                  Link expired
                </span>
              ) : (
                <button className="primary-button" type="button" onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading
                    ? usesBrowserDecryption
                      ? "Decrypting and downloading..."
                      : "Opening download..."
                    : "Download file"}
                </button>
              )}
              <a className="secondary-button" href="#works">
                Open secure tools
              </a>
            </div>
            {downloadError ? <p className="error-banner">{downloadError}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function App() {
  const apiBaseUrl = (
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? "http://localhost:5000" : "")
  ).replace(/\/+$/, "");
  const fileInputRef = useRef(null);
  const secureQrPreviewRef = useRef(null);
  const qrPreviewRef = useRef(null);
  const qrCodeRef = useRef(null);
  const qrLogoInputRef = useRef(null);
  const qrLogoUrlRef = useRef("");

  const [routePath, setRoutePath] = useState(() => getCurrentRoutePath());
  const [tab, setTab] = useState("secure");
  const [health, setHealth] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultRemainingSeconds, setResultRemainingSeconds] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [secureQrCopied, setSecureQrCopied] = useState(false);

  const [bwipStatus, setBwipStatus] = useState("loading");
  const [bwipError, setBwipError] = useState("");

  const [qrMode, setQrMode] = useState("single");
  const [qrStylePreset, setQrStylePreset] = useState("rounded");
  const [qrText, setQrText] = useState("https://example.com/download/demo");
  const [qrBatchText, setQrBatchText] = useState(
    "https://example.com/alpha\nhttps://example.com/beta\nhttps://example.com/gamma",
  );
  const [qrVCard, setQrVCard] = useState({
    ...EMPTY_VCARD,
    firstName: "Secure",
    lastName: "Support",
    company: "Secure File Transfer",
    email: "support@example.com",
    website: "https://example.com",
    phone: "+1 555 123 4567",
  });
  const [qrSize, setQrSize] = useState(300);
  const [qrPadding, setQrPadding] = useState(8);
  const [qrLevel, setQrLevel] = useState("M");
  const [qrForeground, setQrForeground] = useState("#1f6a34");
  const [qrCornerColor, setQrCornerColor] = useState("#1f6a34");
  const [qrCornerDotColor, setQrCornerDotColor] = useState("#163f1e");
  const [qrBackground, setQrBackground] = useState("#fbf7ec");
  const [qrDotStyle, setQrDotStyle] = useState("rounded");
  const [qrCornerStyle, setQrCornerStyle] = useState("extra-rounded");
  const [qrCornerDotStyle, setQrCornerDotStyle] = useState("dot");
  const [qrShape, setQrShape] = useState("square");
  const [qrLogoUrl, setQrLogoUrl] = useState("");
  const [qrLogoName, setQrLogoName] = useState("");
  const [qrLogoScale, setQrLogoScale] = useState(0.32);
  const [qrError, setQrError] = useState("");
  const [qrContentCopied, setQrContentCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const [barcodeMode, setBarcodeMode] = useState("single");
  const [barcodeType, setBarcodeType] = useState("datamatrix");
  const [barcodeText, setBarcodeText] = useState("SECURE-FILE-123");
  const [barcodeBatchText, setBarcodeBatchText] = useState("BATCH-001\nBATCH-002\nBATCH-003");
  const [barcodeSize, setBarcodeSize] = useState(300);
  const [barcodePadding, setBarcodePadding] = useState(8);
  const [barcodeForeground, setBarcodeForeground] = useState("#0f2214");
  const [barcodeBackground, setBarcodeBackground] = useState("#ffffff");
  const [barcodeShowText, setBarcodeShowText] = useState(true);
  const [barcodeMarkup, setBarcodeMarkup] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeCopied, setBarcodeCopied] = useState(false);

  const maxUploadSizeMb = health?.maxUploadSizeMb ?? 4;
  const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;
  const supportsDirectUpload = Boolean(health?.capabilities?.directUpload);
  const minExpiry = health?.minExpirySeconds ?? 31;
  const maxExpiry = health?.maxExpirySeconds ?? 86399;
  const expiryValid =
    Number.isFinite(expirySeconds) && expirySeconds >= minExpiry && expirySeconds <= maxExpiry;
  const expiryParts = getDurationParts(expirySeconds);
  const hourOptions = Array.from(
    { length: Math.max(Math.floor(maxExpiry / 3600), expiryParts.hours) + 1 },
    (_, index) => index,
  );
  const qrBatchItems = splitBatchItems(qrBatchText);
  const qrData =
    qrMode === "vcard" ? buildVCard(qrVCard) : qrMode === "batch" ? (qrBatchItems[0] ?? "") : qrText;
  const qrHasData = Boolean(qrData.trim());

  const barcodeBatchItems = splitBatchItems(barcodeBatchText);
  const barcodeMeta = BARCODE_TYPES.find((item) => item.value === barcodeType) ?? BARCODE_TYPES[0];
  const barcodeSourceText = barcodeMode === "batch" ? barcodeBatchItems[0] ?? "" : barcodeText;
  const barcodeSupportsText = ["code128", "code39", "ean13", "upca"].includes(barcodeType);
  const barcodeHasData = Boolean(barcodeSourceText.trim());
  const resultExpired = Boolean(result) && resultRemainingSeconds !== null && resultRemainingSeconds <= 0;
  const shareToken = getShareTokenFromRoute(routePath);
  const shareLink = result?.shareToken ? buildShareLink(result.shareToken) : "";
  const showLanding = !shareToken && routePath === "/";

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        const payload = await response.json();
        setHealth(payload);
        const nextMin = payload.minExpirySeconds ?? 31;
        const nextMax = payload.maxExpirySeconds ?? 86399;
        const defaultExpiry = Number(payload.defaultExpirySeconds ?? 3600);
        const normalizedExpiry = Number.isFinite(defaultExpiry)
          ? Math.min(Math.max(defaultExpiry, nextMin), nextMax)
          : 3600;
        setExpirySeconds((current) =>
          current > 0 ? Math.min(Math.max(current, nextMin), nextMax) : normalizedExpiry,
        );
      } catch {
        setHealth({ status: "offline", runtimeMode: "offline", cleanupIntervalSeconds: 60 });
      }
    };
    loadHealth();
  }, [apiBaseUrl]);

  useEffect(() => {
    const handleHashChange = () => {
      setRoutePath(getCurrentRoutePath());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    loadBwipJs()
      .then(() => {
        setBwipStatus("ready");
        setBwipError("");
      })
      .catch((error) => {
        setBwipStatus("error");
        setBwipError(error.message);
      });
  }, []);

  useEffect(() => {
    if (!linkCopied && !secureQrCopied && !qrContentCopied && !qrCopied && !barcodeCopied) return undefined;
    const timeout = window.setTimeout(() => {
      setLinkCopied(false);
      setSecureQrCopied(false);
      setQrContentCopied(false);
      setQrCopied(false);
      setBarcodeCopied(false);
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [linkCopied, secureQrCopied, qrContentCopied, qrCopied, barcodeCopied]);

  useEffect(() => {
    if (!result?.expiresAt) {
      setResultRemainingSeconds(null);
      return undefined;
    }

    const syncRemainingTime = () => {
      setResultRemainingSeconds(getSecondsRemaining(result.expiresAt));
    };

    syncRemainingTime();
    const interval = window.setInterval(syncRemainingTime, 1000);
    return () => window.clearInterval(interval);
  }, [result?.expiresAt]);

  useEffect(() => {
    if (!barcodeSupportsText && barcodeShowText) {
      setBarcodeShowText(false);
    }
  }, [barcodeSupportsText, barcodeShowText]);

  useEffect(() => {
    if (tab !== "qr") return;
    const container = qrPreviewRef.current;
    if (!container) return;

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        type: "canvas",
        data: qrData || " ",
      });
    }

    qrCodeRef.current.append(container);

    if (!qrHasData) {
      container.innerHTML = "";
      setQrError(getQrEmptyMessage(qrMode));
      return;
    }

    try {
      qrCodeRef.current.update({
        width: qrSize,
        height: qrSize,
        type: "canvas",
        shape: qrShape,
        data: qrData,
        margin: qrPadding,
        image: qrLogoUrl || undefined,
        qrOptions: {
          errorCorrectionLevel: qrLevel,
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: qrLogoUrl ? qrLogoScale : 0.01,
          margin: qrLogoUrl ? 6 : 0,
          saveAsBlob: true,
          crossOrigin: "anonymous",
        },
        dotsOptions: {
          color: qrForeground,
          type: qrDotStyle,
        },
        cornersSquareOptions: {
          color: qrCornerColor,
          type: qrCornerStyle,
        },
        cornersDotOptions: {
          color: qrCornerDotColor,
          type: qrCornerDotStyle,
        },
        backgroundOptions: {
          color: qrBackground,
        },
      });
      setQrError("");
    } catch (error) {
      container.innerHTML = "";
      setQrError(error.message || "QR generation failed.");
    }
  }, [
    tab,
    qrData,
    qrHasData,
    qrMode,
    qrSize,
    qrPadding,
    qrLevel,
    qrForeground,
    qrCornerColor,
    qrCornerDotColor,
    qrBackground,
    qrDotStyle,
    qrCornerStyle,
    qrCornerDotStyle,
    qrShape,
    qrLogoUrl,
    qrLogoScale,
  ]);

  useEffect(() => {
    if (bwipStatus !== "ready") return;
    if (!barcodeHasData) {
      setBarcodeMarkup("");
      setBarcodeError(getBarcodeEmptyMessage(barcodeMeta.label, barcodeMode));
      return;
    }

    try {
      const options = {
        bcid: barcodeType,
        text: barcodeSourceText,
        scale: Math.max(3, Math.round(barcodeSize / 120)),
        paddingwidth: barcodePadding,
        paddingheight: barcodePadding,
        barcolor: stripHash(barcodeForeground),
        backgroundcolor: stripHash(barcodeBackground),
      };

      if (barcodeType === "code128" || barcodeType === "code39") {
        options.height = Math.max(16, Math.round(barcodeSize / 18));
      }
      if (barcodeSupportsText) {
        options.includetext = barcodeShowText;
        options.textxalign = "center";
      }

      setBarcodeMarkup(window.bwipjs.toSVG(options));
      setBarcodeError("");
    } catch (error) {
      setBarcodeMarkup("");
      setBarcodeError(error.message || `${barcodeMeta.label} generation failed.`);
    }
  }, [
    bwipStatus,
    barcodeHasData,
    barcodeMeta.label,
    barcodeMode,
    barcodeType,
    barcodeSourceText,
    barcodeSize,
    barcodePadding,
    barcodeForeground,
    barcodeBackground,
    barcodeShowText,
    barcodeSupportsText,
  ]);

  useEffect(() => {
    return () => {
      if (qrLogoUrlRef.current) {
        URL.revokeObjectURL(qrLogoUrlRef.current);
      }
    };
  }, []);

  const onFilesSelected = (fileList) => {
    const [file] = Array.from(fileList ?? []);

    if (file && file.size >= maxUploadSizeBytes) {
      setSelectedFile(null);
      setResult(null);
      setUploadError(`File must be smaller than ${maxUploadSizeMb} MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file ?? null);
    setResult(null);
    setUploadError("");
  };

  const updateExpirySeconds = (nextValue) => {
    const normalizedValue = Math.min(
      Math.max(Math.floor(Number(nextValue) || 0), minExpiry),
      maxExpiry,
    );
    setExpirySeconds(normalizedValue);
    setUploadError("");
  };

  const updateExpiryPart = (unit, nextValue) => {
    const nextParts = { ...expiryParts, [unit]: Number(nextValue) };
    updateExpirySeconds(nextParts.hours * 3600 + nextParts.minutes * 60 + nextParts.seconds);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return setUploadError("Choose a file before uploading.");
    if (selectedFile.size >= maxUploadSizeBytes) {
      return setUploadError(`File must be smaller than ${maxUploadSizeMb} MB.`);
    }
    if (!expiryValid) {
      return setUploadError(`Lifetime must be between ${minExpiry} and ${maxExpiry} seconds.`);
    }

    setIsUploading(true);
    setUploadError("");
    try {
      if (supportsDirectUpload) {
        const initResponse = await fetch(`${apiBaseUrl}/api/files/upload/init`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            filename: selectedFile.name,
            contentType: selectedFile.type || "application/octet-stream",
            fileSize: selectedFile.size,
            expirySeconds,
          }),
        });
        const initPayload = await initResponse.json().catch(() => ({}));
        if (!initResponse.ok) {
          throw new Error(initPayload.message ?? "Upload initialization failed.");
        }

        const { encryptedBlob, encryptedSize, encryptionKey } = await encryptFileInBrowser(selectedFile);

        const directUploadResponse = await fetch(initPayload.uploadUrl, {
          method: "PUT",
          headers: {
            "content-type": "application/octet-stream",
          },
          body: encryptedBlob,
        });

        if (!directUploadResponse.ok) {
          throw new Error("Direct file upload failed.");
        }

        const completeResponse = await fetch(`${apiBaseUrl}/api/files/upload/complete`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            shareToken: initPayload.shareToken,
            objectKey: initPayload.objectKey,
            filename: initPayload.filename,
            contentType: initPayload.contentType,
            fileSize: selectedFile.size,
            encryptedSize,
            encryptionKey,
            expirySeconds,
          }),
        });
        const completePayload = await completeResponse.json().catch(() => ({}));
        if (!completeResponse.ok) {
          throw new Error(completePayload.message ?? "Upload completion failed.");
        }
        setResult(completePayload);
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("expirySeconds", String(expirySeconds));
      const response = await fetch(`${apiBaseUrl}/api/files/upload`, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Upload failed.");
      setResult(payload);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const copyValue = async (value, onSuccess, onError) => {
    try {
      await navigator.clipboard.writeText(value);
      onSuccess();
    } catch (error) {
      onError(error);
    }
  };

  const applyQrTemplate = (template) => {
    setQrMode("single");
    setQrText(template.value);
    setQrError("");
  };

  const applyQrStylePreset = (preset) => {
    setQrStylePreset(preset.id);
    setQrForeground(preset.foreground);
    setQrCornerColor(preset.cornerColor);
    setQrCornerDotColor(preset.cornerDotColor);
    setQrBackground(preset.background);
    setQrDotStyle(preset.dotType);
    setQrCornerStyle(preset.cornerType);
    setQrCornerDotStyle(preset.cornerDotType);
    setQrShape(preset.shape);
    setQrLevel(preset.level);
  };

  const handleQrLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (qrLogoUrlRef.current) {
      URL.revokeObjectURL(qrLogoUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    qrLogoUrlRef.current = nextUrl;
    setQrLogoUrl(nextUrl);
    setQrLogoName(file.name);
  };

  const clearQrLogo = () => {
    if (qrLogoUrlRef.current) {
      URL.revokeObjectURL(qrLogoUrlRef.current);
      qrLogoUrlRef.current = "";
    }
    setQrLogoUrl("");
    setQrLogoName("");
    if (qrLogoInputRef.current) {
      qrLogoInputRef.current.value = "";
    }
  };

  const handleQrExport = async (extension) => {
    if (!qrHasData) return;
    try {
      const blob = await exportQrBlob(qrCodeRef.current, extension);
      downloadBlob(blob, `qr-code.${extension}`);
      setQrError("");
    } catch (error) {
      setQrError(error.message || "QR export failed.");
    }
  };

  const handleQrCopyImage = async () => {
    if (!qrHasData) return;
    try {
      const previewCanvas = qrPreviewRef.current?.querySelector("canvas");
      const blob = previewCanvas
        ? await canvasElementToPngBlob(previewCanvas, Math.max(qrSize * 4, 1200), {
            backgroundColor: qrBackground,
            padding: Math.max(40, Math.round(qrSize * 0.18)),
          })
        : await exportQrBlob(qrCodeRef.current, "png");
      await copyBlobToClipboard(blob);
      setQrCopied(true);
      setQrError("");
    } catch (error) {
      setQrError(error.message || "Clipboard access failed.");
    }
  };

  const handleQrCopyContent = async () => {
    if (!qrHasData) return;
    try {
      await navigator.clipboard.writeText(qrData);
      setQrContentCopied(true);
      setQrError("");
    } catch (error) {
      setQrError(error.message || "Clipboard access failed.");
    }
  };

  const handleSecureQrCopyImage = async () => {
    if (!result?.downloadLink) return;

    try {
      const svgElement = secureQrPreviewRef.current?.querySelector("svg");
      const blob = await svgElementToPngBlob(svgElement, 1200, {
        backgroundColor: "#ffffff",
        padding: 96,
      });
      await copyBlobToClipboard(blob);
      setSecureQrCopied(true);
      setUploadError("");
    } catch (error) {
      setUploadError(error.message || "Clipboard access failed.");
    }
  };

  const handleBarcodeCopyImage = async () => {
    if (!barcodeMarkup) return;
    try {
      const blob = await markupToPngBlob(barcodeMarkup, barcodeSize);
      await copyBlobToClipboard(blob);
      setBarcodeCopied(true);
      setBarcodeError("");
    } catch (error) {
      setBarcodeError(error.message || "Clipboard access failed.");
    }
  };

  const qrCopyContentLabel =
    qrContentCopied ? "Copied" : /^https?:\/\//i.test(qrData) ? "Copy link" : "Copy content";

  return (
    <div className="app-shell">
      {!showLanding ? (
        <div className="app-waves-background" aria-hidden="true">
          <div className="app-waves-frame">
            <Waves
              className="app-waves-surface"
              strokeColor="rgba(255, 255, 255, 0.88)"
              backgroundColor="#000000"
              pointerSize={0}
            />
          </div>
        </div>
      ) : null}
      <main className="app-layout">
        {shareToken ? (
          <SharePage apiBaseUrl={apiBaseUrl} shareToken={shareToken} />
        ) : showLanding ? (
          <SpiralDemo />
        ) : (
          <section id="works" className="home-content-stack">
            <div className="tab-strip page-tab-strip" role="tablist" aria-label="Tool tabs">
              {TABS.map((item) => (
                <button key={item.id} className={`tab-button ${tab === item.id ? "is-active" : ""}`} type="button" onClick={() => setTab(item.id)}>
                  <span className="tab-button__content">
                    {renderToolTabLogo(item.id, "tab-button__icon")}
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </div>

            {tab === "secure" ? (
              <section className="workspace-grid">
            <form className="panel form-panel" onSubmit={handleUpload}>
              <div className="panel-heading"><p className="panel-kicker">Secure upload</p><h2>Create a temporary download link</h2></div>
              <button
                className={`dropzone ${dragging ? "is-dragging" : ""}`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); onFilesSelected(event.dataTransfer.files); }}
              >
                <span className="dropzone-badge">{supportsDirectUpload ? "Encrypted in browser" : "Encrypted on upload"}</span>
                <strong>{selectedFile ? selectedFile.name : "Drop a file or click to browse"}</strong>
                <span>
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} selected`
                    : supportsDirectUpload
                      ? `Files under ${maxUploadSizeMb} MB are encrypted in your browser, then uploaded securely.`
                      : `Files under ${maxUploadSizeMb} MB stay encrypted until they expire.`}
                </span>
              </button>
              <input ref={fileInputRef} type="file" hidden onChange={(event) => onFilesSelected(event.target.files)} />
              <div className="field timer-field">
                <div className="timer-header">
                  <div className="timer-copy">
                    <span>Link lifetime</span>
                    <small>Choose how long the download link stays active.</small>
                  </div>
                  <div className="timer-readout-stack">
                    <span className="timer-readout-label">Selected</span>
                    <strong className="timer-readout" aria-live="polite">{formatTimerValue(expirySeconds)}</strong>
                    <span className="timer-readout-note">{formatLongDuration(expirySeconds)}</span>
                  </div>
                </div>
                <div className="timer-picker" role="group" aria-label="Link lifetime selector">
                  <DropdownSelect
                    label="Hours"
                    value={expiryParts.hours}
                    options={hourOptions}
                    onChange={(nextValue) => updateExpiryPart("hours", nextValue)}
                    formatValue={padTimeUnit}
                  />
                  <DropdownSelect
                    label="Minutes"
                    value={expiryParts.minutes}
                    options={TIME_SEGMENT_OPTIONS}
                    onChange={(nextValue) => updateExpiryPart("minutes", nextValue)}
                    formatValue={padTimeUnit}
                  />
                  <DropdownSelect
                    label="Seconds"
                    value={expiryParts.seconds}
                    options={TIME_SEGMENT_OPTIONS}
                    onChange={(nextValue) => updateExpiryPart("seconds", nextValue)}
                    formatValue={padTimeUnit}
                  />
                </div>
              </div>
              <p className="field-hint">Allowed range: {formatTimerValue(minExpiry)} to {formatTimerValue(maxExpiry)} ({minExpiry} to {maxExpiry} seconds).</p>
              {!expiryValid ? <p className="warning-banner">Lifetime must stay inside the allowed range.</p> : null}
              {uploadError ? <p className="error-banner">{uploadError}</p> : null}
              <button className="primary-button" type="submit" disabled={isUploading}>
                {isUploading
                  ? supportsDirectUpload
                    ? "Encrypting in browser and uploading..."
                    : "Encrypting and uploading..."
                  : "Generate secure link"}
              </button>
            </form>
            <section className="panel preview-panel preview-panel-dark">
              <div className="panel-heading"><p className="panel-kicker">Result</p><h2>{result ? "Link ready to share" : "Waiting for upload"}</h2></div>
              {result ? (
                <div className="result-stack">
                  <div className={`countdown-card ${resultExpired ? "is-expired" : ""}`}>
                    <span className="countdown-label">{resultExpired ? "Link expired" : "Time remaining"}</span>
                    <strong className="countdown-value">{formatTimerValue(resultRemainingSeconds ?? result.expirySeconds)}</strong>
                    <p>
                      {resultExpired
                        ? "This secure link has expired. Upload the file again to generate a new one."
                        : `Expires ${formatDateTime(result.expiresAt)}`}
                    </p>
                  </div>
                  <div ref={secureQrPreviewRef} className="preview-frame preview-frame-qr"><QRCode value={shareLink} size={220} bgColor="transparent" fgColor="#081426" /></div>
                  <div className="detail-list">
                    <p><strong>{result.filename}</strong></p>
                    <p>Original size: {formatBytes(result.fileSize)}</p>
                    <p>Encrypted size: {formatBytes(result.encryptedSize)}</p>
                    <p>Expires: {formatDateTime(result.expiresAt)}</p>
                    <p>Lifetime: {formatDuration(result.expirySeconds)}</p>
                    <p>Time left: {resultExpired ? "Expired" : formatLongDuration(resultRemainingSeconds ?? result.expirySeconds)}</p>
                  </div>
                  <div className="action-row action-row-wrap secure-result-actions">
                    {resultExpired ? (
                      <span className="primary-button button-disabled button-disabled-primary" aria-disabled="true">Link expired</span>
                    ) : (
                      <a className="primary-button" href={shareLink} target="_blank" rel="noreferrer">Open link</a>
                    )}
                    {resultExpired ? (
                      <span className="secondary-button button-disabled" aria-disabled="true">Copy link unavailable</span>
                    ) : (
                      <button className="secondary-button" type="button" onClick={() => copyValue(shareLink, () => setLinkCopied(true), () => setUploadError("Clipboard access failed."))}>{linkCopied ? "Copied" : "Copy link"}</button>
                    )}
                    {resultExpired ? (
                      <span className="secondary-button button-disabled" aria-disabled="true">Copy QR unavailable</span>
                    ) : (
                      <button className="secondary-button" type="button" onClick={handleSecureQrCopyImage}>{secureQrCopied ? "QR copied" : "Copy QR"}</button>
                    )}
                  </div>
                  <code className="link-preview">{shareLink}</code>
                </div>
              ) : <div className="placeholder-state"><p>Upload a file to generate a link and QR code. Expired data is deleted automatically.</p></div>}
            </section>
          </section>
        ) : null}

        {tab === "qr" ? (
          <section className="tool-shell tool-shell-qr tool-shell-dashboard">
            <div className="tool-topbar">
              <div className="tool-badge" aria-hidden="true">
                <QrToolLogo className="tool-badge__icon" />
              </div>
              <div className="tool-heading-block">
                <div className="tool-title-row">
                  <h2>QR Generator</h2>
                  <span className="tool-inline-pill">Other Tools</span>
                </div>
                <p className="tool-subtitle">Generate styled QR codes with custom colors, shapes, and logos.</p>
              </div>
            </div>

            <div className="mode-strip" role="tablist" aria-label="QR generator modes">
              {QR_EDITOR_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`mode-button ${qrMode === mode.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setQrMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="tool-form-group tool-form-group-content qr-content-panel">
              <div className="tool-form-header">
                <h3>Content</h3>
                {qrMode === "batch" ? <span className="tool-caption">{qrBatchItems.length} items ready</span> : null}
              </div>
              {qrMode === "single" ? (
                <>
                  <label className="field tool-field">
                    <textarea rows="3" value={qrText} onChange={(event) => setQrText(event.target.value)} placeholder="Enter URL, text, or data..." />
                  </label>
                  <div className="tool-chip-row">
                    {QR_CONTENT_TEMPLATES.map((template) => (
                      <button key={template.id} className="tool-chip" type="button" onClick={() => applyQrTemplate(template)}>
                        {template.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {qrMode === "vcard" ? (
                <div className="tool-input-grid tool-input-grid-vcard">
                  <label className="field tool-field"><span>First Name</span><input value={qrVCard.firstName} onChange={(event) => setQrVCard((current) => ({ ...current, firstName: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Last Name</span><input value={qrVCard.lastName} onChange={(event) => setQrVCard((current) => ({ ...current, lastName: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Company</span><input value={qrVCard.company} onChange={(event) => setQrVCard((current) => ({ ...current, company: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Title</span><input value={qrVCard.title} onChange={(event) => setQrVCard((current) => ({ ...current, title: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Phone</span><input value={qrVCard.phone} onChange={(event) => setQrVCard((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Email</span><input value={qrVCard.email} onChange={(event) => setQrVCard((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label className="field tool-field"><span>Website</span><input value={qrVCard.website} onChange={(event) => setQrVCard((current) => ({ ...current, website: event.target.value }))} /></label>
                  <label className="field tool-field field-span-2"><span>Address</span><textarea rows="2" value={qrVCard.address} onChange={(event) => setQrVCard((current) => ({ ...current, address: event.target.value }))} placeholder="Street, City, State" /></label>
                </div>
              ) : null}

              {qrMode === "batch" ? (
                <>
                  <label className="field tool-field">
                    <textarea rows="4" value={qrBatchText} onChange={(event) => setQrBatchText(event.target.value)} placeholder="Enter one QR payload per line..." />
                  </label>
                  <p className="field-hint">Preview shows the first line. Keep one value per line for batch preparation.</p>
                </>
              ) : null}
            </div>

            <div className="generator-layout">
              <div className="generator-main generator-main-qr">
                <section className="generator-panel generator-panel-preview">
                  <div className="tool-form-header">
                    <h3>Preview</h3>
                    <span className="tool-caption">{qrSize}px</span>
                  </div>
                  <div className={`preview-frame preview-frame-tool ${qrHasData ? "" : "is-empty"}`}>
                    {qrHasData ? <div className="qr-preview-host" ref={qrPreviewRef} /> : <p>{getQrEmptyMessage(qrMode)}</p>}
                  </div>
                  {qrMode === "batch" && qrBatchItems.length ? <p className="field-hint">Previewing the first of {qrBatchItems.length} QR codes.</p> : null}
                </section>

                <section className="generator-panel generator-panel-styles">
                  <div className="tool-form-header">
                    <h3>Quick Styles</h3>
                  </div>
                  <div className="tool-chip-row tool-chip-row-wide">
                    {QR_STYLE_PRESETS.map((preset) => (
                      <button key={preset.id} className={`tool-chip ${qrStylePreset === preset.id ? "is-active" : ""}`} type="button" onClick={() => applyQrStylePreset(preset)}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="action-row action-row-wrap generator-actions generator-actions-qr">
                    <button className="primary-button" type="button" disabled={!qrHasData} onClick={() => handleQrExport("png")}>PNG</button>
                    <button className="secondary-button" type="button" disabled={!qrHasData} onClick={() => handleQrExport("svg")}>SVG</button>
                    <button className="secondary-button" type="button" disabled={!qrHasData} onClick={handleQrCopyContent}>{qrCopyContentLabel}</button>
                    <button className="secondary-button" type="button" disabled={!qrHasData} onClick={handleQrCopyImage}>{qrCopied ? "QR copied" : "Copy QR"}</button>
                  </div>
                </section>
              </div>

              <aside className="generator-sidebar generator-sidebar-qr">
                <section className="option-card option-card-basics">
                  <div className="tool-form-header"><h3>Basics</h3></div>
                  <label className="field tool-field">
                    <div className="slider-header"><span>Size</span><strong>{qrSize}px</strong></div>
                    <input type="range" min="180" max="420" step="10" value={qrSize} onChange={(event) => setQrSize(Number(event.target.value))} />
                  </label>
                  <label className="field tool-field">
                    <div className="slider-header"><span>Padding</span><strong>{qrPadding}</strong></div>
                    <input type="range" min="0" max="24" step="1" value={qrPadding} onChange={(event) => setQrPadding(Number(event.target.value))} />
                  </label>
                  <div className="field tool-field">
                    <span>Error Correction</span>
                    <div className="pill-group">
                      {QR_LEVELS.map((level) => (
                        <button key={level} className={`pill-button ${qrLevel === level ? "is-active" : ""}`} type="button" onClick={() => setQrLevel(level)}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="option-card option-card-colours">
                  <div className="tool-form-header"><h3>Colours</h3></div>
                  <div className="tool-input-grid">
                    <ColorPickerField className="qr-colour-field" label="Foreground" value={qrForeground} onChange={setQrForeground} />
                    <ColorPickerField className="qr-colour-field" label="Background" value={qrBackground} onChange={setQrBackground} />
                    <ColorPickerField className="qr-colour-field" label="Eye Frame" value={qrCornerColor} onChange={setQrCornerColor} />
                    <ColorPickerField className="qr-colour-field" label="Eye Pupil" value={qrCornerDotColor} onChange={setQrCornerDotColor} />
                  </div>
                </section>

                <section className="option-card option-card-shapes">
                  <div className="tool-form-header"><h3>Shapes</h3></div>
                  <div className="field tool-field">
                    <span>Bit Style</span>
                    <div className="pill-group">
                      {QR_DOT_TYPES.map((type) => (
                        <button key={type.id} className={`pill-button ${qrDotStyle === type.id ? "is-active" : ""}`} type="button" onClick={() => setQrDotStyle(type.id)}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field tool-field">
                    <span>Eyes</span>
                    <div className="pill-group">
                      {QR_CORNER_TYPES.map((type) => (
                        <button key={type.id} className={`pill-button ${qrCornerStyle === type.id ? "is-active" : ""}`} type="button" onClick={() => setQrCornerStyle(type.id)}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field tool-field">
                    <span>Pupils</span>
                    <div className="pill-group">
                      {QR_CORNER_TYPES.map((type) => (
                        <button key={type.id} className={`pill-button ${qrCornerDotStyle === type.id ? "is-active" : ""}`} type="button" onClick={() => setQrCornerDotStyle(type.id)}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field tool-field">
                    <span>Canvas Shape</span>
                    <div className="pill-group">
                      {["square", "circle"].map((shape) => (
                        <button key={shape} className={`pill-button ${qrShape === shape ? "is-active" : ""}`} type="button" onClick={() => setQrShape(shape)}>
                          {shape === "square" ? "Square" : "Circle"}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="option-card option-card-logo">
                  <div className="tool-form-header"><h3>Logo / Image</h3></div>
                  <input ref={qrLogoInputRef} type="file" hidden accept="image/*" onChange={handleQrLogoChange} />
                  <div className="action-row action-row-wrap">
                    <button className="secondary-button" type="button" onClick={() => qrLogoInputRef.current?.click()}>{qrLogoUrl ? "Replace image" : "Upload image"}</button>
                    <button className="secondary-button" type="button" disabled={!qrLogoUrl} onClick={clearQrLogo}>Remove</button>
                  </div>
                  {qrLogoName ? <p className="field-hint">Current image: {qrLogoName}</p> : <p className="field-hint">Optional center logo for branded QR codes.</p>}
                  <label className="field tool-field">
                    <div className="slider-header"><span>Logo Size</span><strong>{Math.round(qrLogoScale * 100)}%</strong></div>
                    <input type="range" min="10" max="45" step="1" value={Math.round(qrLogoScale * 100)} onChange={(event) => setQrLogoScale(Number(event.target.value) / 100)} />
                  </label>
                </section>
              </aside>
            </div>

            {qrError ? <p className="error-banner">{qrError}</p> : null}
            <section className="about-card about-card-inline">
              <h3>About QR Code</h3>
              <p>Use single content, contact cards, or prepared batches. The copy button now copies the generated QR image itself to the clipboard as a PNG.</p>
            </section>
          </section>
        ) : null}

            {tab === "barcode" ? (
              <section className="tool-shell tool-shell-barcode tool-shell-dashboard">
            <div className="tool-topbar">
              <div className="tool-badge" aria-hidden="true">
                <BarcodeToolLogo className="tool-badge__icon" />
              </div>
              <div className="tool-heading-block">
                <div className="tool-title-row">
                  <h2>Barcode Generator</h2>
                  <span className="tool-inline-pill">Other Tools</span>
                </div>
                <p className="tool-subtitle">Generate Data Matrix, Aztec, PDF417, Code 128, EAN-13, and more.</p>
              </div>
            </div>

            <div className="tool-form-group tool-form-group-types">
              <div className="tool-form-header">
                <h3>Code Type</h3>
              </div>
              <div className="tool-chip-row tool-chip-row-wide">
                {BARCODE_TYPES.map((item) => (
                  <button key={item.value} className={`tool-chip ${barcodeType === item.value ? "is-active" : ""}`} type="button" onClick={() => setBarcodeType(item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mode-strip" role="tablist" aria-label="Barcode generator modes">
              {BARCODE_EDITOR_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`mode-button ${barcodeMode === mode.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setBarcodeMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="tool-form-group tool-form-group-content">
              <div className="tool-form-header">
                <h3>Content</h3>
                <span className="tool-caption">{barcodeMeta.label}</span>
              </div>
              {barcodeMode === "single" ? (
                <>
                  <label className="field tool-field">
                    <textarea rows="2" value={barcodeText} onChange={(event) => setBarcodeText(event.target.value)} placeholder={barcodeMeta.placeholder} />
                  </label>
                  <p className="field-hint">{barcodeMeta.note}</p>
                </>
              ) : (
                <>
                  <label className="field tool-field">
                    <textarea rows="4" value={barcodeBatchText} onChange={(event) => setBarcodeBatchText(event.target.value)} placeholder="Enter one barcode value per line..." />
                  </label>
                  <p className="field-hint">Preview shows the first line. {barcodeBatchItems.length} values are queued.</p>
                </>
              )}
            </div>

            <div className="generator-layout">
              <div className="generator-main generator-main-barcode">
                <section className="generator-panel">
                  <div className="tool-form-header">
                    <h3>Preview</h3>
                    <span className="tool-caption">{barcodeSize}px</span>
                  </div>
                  <div className={`preview-frame preview-frame-tool ${barcodeMarkup ? "" : "is-empty"}`}>
                    {barcodeMarkup ? (
                      <div
                        className="barcode-preview-host"
                        style={{ width: "100%", maxWidth: `${barcodeSize}px`, marginInline: "auto" }}
                        dangerouslySetInnerHTML={{ __html: barcodeMarkup }}
                      />
                    ) : (
                      <p>{getBarcodeEmptyMessage(barcodeMeta.label, barcodeMode)}</p>
                    )}
                  </div>
                </section>

                <div className="action-row action-row-wrap generator-actions">
                  <button className="primary-button" type="button" disabled={!barcodeMarkup} onClick={async () => { if (!barcodeMarkup) return; try { await downloadPng(barcodeMarkup, `${barcodeType}.png`, barcodeSize); setBarcodeError(""); } catch (error) { setBarcodeError(error.message || "PNG export failed."); } }}>PNG</button>
                  <button className="secondary-button" type="button" disabled={!barcodeMarkup} onClick={() => barcodeMarkup && downloadSvg(barcodeMarkup, `${barcodeType}.svg`)}>SVG</button>
                  <button className="secondary-button" type="button" disabled={!barcodeMarkup} onClick={handleBarcodeCopyImage}>{barcodeCopied ? "Copied" : "Copy"}</button>
                </div>
              </div>

              <aside className="generator-sidebar generator-sidebar-barcode">
                <section className="option-card option-card-basics">
                  <div className="tool-form-header"><h3>Basic Settings</h3></div>
                  <label className="field tool-field">
                    <div className="slider-header"><span>Size</span><strong>{barcodeSize}px</strong></div>
                    <input type="range" min="220" max="520" step="10" value={barcodeSize} onChange={(event) => setBarcodeSize(Number(event.target.value))} />
                  </label>
                  <label className="field tool-field">
                    <div className="slider-header"><span>Padding</span><strong>{barcodePadding}</strong></div>
                    <input type="range" min="0" max="24" step="1" value={barcodePadding} onChange={(event) => setBarcodePadding(Number(event.target.value))} />
                  </label>
                  <label className="toggle-field">
                    <input type="checkbox" checked={barcodeShowText} disabled={!barcodeSupportsText} onChange={(event) => setBarcodeShowText(event.target.checked)} />
                    <span>Show text below the code</span>
                  </label>
                </section>

                <section className="option-card option-card-colours">
                  <div className="tool-form-header"><h3>Colours</h3></div>
                  <div className="tool-input-grid">
                    <ColorPickerField label="Foreground" value={barcodeForeground} onChange={setBarcodeForeground} />
                    <ColorPickerField label="Background" value={barcodeBackground} onChange={setBarcodeBackground} />
                  </div>
                </section>
              </aside>
            </div>

            {bwipStatus === "error" ? <p className="error-banner">{bwipError}</p> : null}
            {barcodeError ? <p className="error-banner">{barcodeError}</p> : null}
            <section className="about-card about-card-inline">
              <h3>About {barcodeMeta.label}</h3>
              <p>{barcodeMeta.note} The copy button now copies the rendered barcode image to the clipboard as a PNG.</p>
            </section>
          </section>
        ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;


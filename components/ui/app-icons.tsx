import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps) {
  return {
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z" />
      <path d="M19 3V6" />
      <path d="M20.5 4.5H17.5" />
    </svg>
  );
}

export function MicrophoneIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11" />
      <path d="M12 18V21" />
      <path d="M8 21H16" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 16V4" />
      <path d="M8 8L12 4L16 8" />
      <path d="M5 18V19C5 20.105 5.895 21 7 21H17C18.105 21 19 20.105 19 19V18" />
    </svg>
  );
}

export function ClipboardCheckIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 4H15" />
      <path d="M10 2H14C15.105 2 16 2.895 16 4V5H8V4C8 2.895 8.895 2 10 2Z" />
      <path d="M8 4H7C5.895 4 5 4.895 5 6V20C5 21.105 5.895 22 7 22H17C18.105 22 19 21.105 19 20V6C19 4.895 18.105 4 17 4H16" />
      <path d="M9 13L11 15L15 10.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M15 18L9 12L15 6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12H19" />
      <path d="M13 6L19 12L13 18" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12.5L9.5 17L19 7.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3V15" />
      <path d="M7 10L12 15L17 10" />
      <path d="M5 20H19" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 9L12 15L18 9" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 15L12 9L18 15" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2.5 12C4.9 7.8 8.1 5.7 12 5.7C15.9 5.7 19.1 7.8 21.5 12C19.1 16.2 15.9 18.3 12 18.3C8.1 18.3 4.9 16.2 2.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 4H17L20 7V20H4V5C4 4.448 4.448 4 5 4Z" />
      <path d="M8 4V9H16V4" />
      <path d="M8 20V14H16V20" />
    </svg>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 8V3H17V8" />
      <path d="M7 17H5C3.895 17 3 16.105 3 15V10C3 8.895 3.895 8 5 8H19C20.105 8 21 8.895 21 10V15C21 16.105 20.105 17 19 17H17" />
      <path d="M7 13H17V21H7V13Z" />
      <path d="M17 11H17.01" />
    </svg>
  );
}

export function DocumentSparkIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 3H14L19 8V20C19 21.105 18.105 22 17 22H7C5.895 22 5 21.105 5 20V5C5 3.895 5.895 3 7 3Z" />
      <path d="M14 3V8H19" />
      <path d="M10.5 12L11.3 14.2L13.5 15L11.3 15.8L10.5 18L9.7 15.8L7.5 15L9.7 14.2L10.5 12Z" />
    </svg>
  );
}

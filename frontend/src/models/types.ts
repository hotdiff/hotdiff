export enum FileStatus {
  Same = 0,
  Different = 1,
  Similar = 2,
  LeftOnly = 3,
  RightOnly = 4,
}

export interface FileResult {
  relativePath: string;
  name: string;
  rightName: string;
  leftPath: string;
  rightPath: string;
  status: FileStatus;
  isBinary: boolean;
  isCsv: boolean;
  isDir: boolean;
  children: FileResult[];
  size: number;
  errMsg?: string;
}

export interface CompareProgress {
  total: number;
  current: number;
  fileName: string;
  completed: boolean;
  error?: string;
  result?: CompareSummary;
}

export interface CompareSummary {
  leftDir: string;
  rightDir: string;
  files: FileResult[];
  totalFiles: number;
  sameCount: number;
  differentCount: number;
  similarCount: number;
  leftOnlyCount: number;
  rightOnlyCount: number;
}

export interface TabData {
  id: string;
  type: 'home' | 'result' | 'file';
  label: string;
  leftPath?: string;
  rightPath?: string;
  result?: CompareSummary;
  progress?: { current: number; total: number; fileName: string };
  error?: string;
  loading?: boolean;
  fileName?: string;
  filePath?: string;
  isCsv?: boolean;
}

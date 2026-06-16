export namespace diff {
	
	export class CsvDiffCell {
	    LeftValue: string;
	    RightValue: string;
	    CellType: number;
	
	    static createFrom(source: any = {}) {
	        return new CsvDiffCell(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.LeftValue = source["LeftValue"];
	        this.RightValue = source["RightValue"];
	        this.CellType = source["CellType"];
	    }
	}
	export class CsvDiffRow {
	    RowNum: number;
	    Cells: CsvDiffCell[];
	
	    static createFrom(source: any = {}) {
	        return new CsvDiffRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.RowNum = source["RowNum"];
	        this.Cells = this.convertValues(source["Cells"], CsvDiffCell);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CsvDiffTable {
	    Headers: CsvDiffCell[];
	    Rows: CsvDiffRow[];
	
	    static createFrom(source: any = {}) {
	        return new CsvDiffTable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Headers = this.convertValues(source["Headers"], CsvDiffCell);
	        this.Rows = this.convertValues(source["Rows"], CsvDiffRow);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class DiffDetailResult {
	    original: string;
	    modified: string;
	    language: string;
	    isCsv: boolean;
	    csvTable?: diff.CsvDiffTable;
	    oldName: string;
	    newName: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DiffDetailResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.original = source["original"];
	        this.modified = source["modified"];
	        this.language = source["language"];
	        this.isCsv = source["isCsv"];
	        this.csvTable = this.convertValues(source["csvTable"], diff.CsvDiffTable);
	        this.oldName = source["oldName"];
	        this.newName = source["newName"];
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}


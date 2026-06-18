export namespace main {
	
	export class DiffDetailResult {
	    original: string;
	    modified: string;
	    language: string;
	    oldName: string;
	    newName: string;
	    isImage: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DiffDetailResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.original = source["original"];
	        this.modified = source["modified"];
	        this.language = source["language"];
	        this.oldName = source["oldName"];
	        this.newName = source["newName"];
	        this.isImage = source["isImage"];
	        this.error = source["error"];
	    }
	}

}


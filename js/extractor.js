var Extractor = function(view) {
	var model = view.model;

	this.extractMetadata = function(pdf) {
		pdf.getMetadata().then(function(metadata) {
			model.set("metadata", metadata);
		});
	};

	this.extract = function() {
		this.nodes = $(".textLayer > div");

		extractText();
		extractTitle();
		extractAbstract();
		extractAuthors();

		extractHTML();
	};

	var extractHTML = function() {
		$(".pageContainer canvas").each(convertCanvasToImage);

		model.set("html", view.$el.html());
	};

	var convertCanvasToImage = function(index, node) {
		$("<img/>", { src: node.toDataURL("image/jpeg", "0.5") }).addClass("page").replaceAll(node);
	};

	var extractText = function() {
		var layers = [];
		this.nodes.each(function() {
			layers.push(this.textContent);
		});
		model.set("text", layers.join("\n"));
	};

	var extractTitle = function() {
		var title = [];
		var largest = 0;

		this.nodes.each(function() {
			var node = this;
			var fontSize = node.style.fontSize.replace(/px$/, "");
		  if ((largest - fontSize) > 0.5) return false; // break
		  largest = fontSize;

		  title.push(node.textContent);
		});

		model.set("title", title.join(" ").replace(/\s+/g, " "));
	};

	var extractAbstract = function() {
		var abstract = [];
		var isAbstract = false;
		var abstractFontSize = 0;

		this.nodes.each(function() {
			var node = this;

			if (isAbstract) {
				var fontSize = node.style.fontSize.replace(/px$/, "");;

				if (abstractFontSize - fontSize > 0.5) {
					// break
					return false;
				}
				abstractFontSize = fontSize;

				abstract.push(node.textContent);
			}

			if (node.textContent === "Abstract") {
				isAbstract = true;
			}
		});

		if (abstract.length) {
			model.set("abstract", abstract.join(" ").replace(/\s+/g, " "));
		}
	};

	var extractAuthors = function() {
		var authors = [];
		var authorExpression = new XRegExp("^\\W*([A-Z]\\p{L}+(?:\\s.+?)?\\s[A-Z]\\p{L}+)$");
		var spaceExpression = new RegExp("\\s+" ,"g");

		this.nodes.each(function(index, node) {
			var text = node.textContent.replace(/\./, "");
			if (!text) return true; // continue;

			var matches = text.match(authorExpression);
			if (matches) {
				text = matches[1];
				var matches = text.match(spaceExpression);
				//if (matches) console.log(matches);
				if (!matches || matches.length > 3) {
					return false;
				}
				authors.push({ name: { full: $.trim(text) } });
			}
		});

		if (authors.length) {
			model.set("creators", authors);
		}
	};
};
// TODO: find a better way of knowing when rendering is finished;

var Renderer = function(view) {
	var rendered = 0;
	var pages = [];

	var extractor = new Extractor(view);

	this.render = function(pdf) {
		this.pdf = pdf;

		extractor.extractMetadata(pdf);

		for (var i = 0; i < pdf.numPages; i++) {
			pages[i] = $("<div/>").addClass("pageContainer").appendTo(view.$el);

			try {
				pdf.getPage(i + 1).then(renderPage);
			}
			catch (e) {
				rendered++;
			}
		}
	};

	var renderPage = function(page) {
		var viewport = page.getViewport(2.0);

		var canvas = document.createElement("canvas");
		canvas.mozOpaque = true;
		canvas.width = viewport.width;
		canvas.height = viewport.height;

		var pageContainer = pages[page.pageNumber - 1];
		pageContainer.css({ width: viewport.width, height: viewport.height });
		pageContainer.append(canvas);

		var context = canvas.getContext("2d");
		context.save();
		context.fillStyle = "rgb(255, 255, 255)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.restore();

		var textLayerDiv = document.createElement('div');
		textLayerDiv.className = 'textLayer';
		pageContainer.append(textLayerDiv);

		var params = {
			canvasContext: context,
			viewport: viewport,
			textLayer: new TextLayerBuilder(textLayerDiv)
		};

		page.render(params).then(function() {
			rendered++;
			if (rendered === this.pdf.numPages) {
				window.setTimeout(extractor.extract, 1000);
			}
		});
	};
};

/*
page.getTextContent().then(function(pageText){
	text[page.pageNumber] = pageText;
	rendered++;
	if (rendered === pdf.numPages) {
		model.set("text", text.join(""));
	}
});
*/
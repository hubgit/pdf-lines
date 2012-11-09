/*jshint browser: true, newcap: true, nomen: false, plusplus: false, undef: true, white: false */
/*global $, Models, Views, Collections */

window.URL = window.URL || window.webkitURL || window.mozURL;

if (typeof console == "undefined") window.console = { log: function() {} };

jQuery.event.fixHooks.drop = { props: [ "dataTransfer" ] };

//PDFJS.disableWorker = true;
PDFJS.workerSrc = "vendor/pdf.js";

var app = {};

$(function() {
	app.models = {
		article: new Models.Article(),
		annotation: new Models.Annotation()
	};

	app.collections = {
		lines: new Collections.Lines(),
		annotations: new Collections.Annotations({ model: app.models.annotation })
	};

	app.views = {
		sidebar: new Views.Sidebar({
			id: "sidebar",
		}),

		main: new Views.Main({
			id: "main",
		}),

		input: new Views.Input({
			id: "input"
		}),

		meta: new Views.Meta({
			id: "meta",
			model: app.models.article
		}),

		pdf: new Views.PDF({
			id: "reader",
			model: app.models.article
		}),

		article: new Views.Article({
			id: "article",
			model: app.models.article
		}),

		annotations: new Views.Annotations({
			id: "annotations",
			collection: app.collections.annotations
		}),

		pdfjs: new Views.PDFJS({
			id: "pdfjs",
			model: app.models.article
		})
	};

	app.views.sidebar.$el.appendTo("body").hide();
	app.views.main.$el.appendTo("body");

	app.views.input.$el.appendTo(app.views.main.$el).show();
	app.views.meta.$el.appendTo(app.views.main.$el);
	app.views.pdf.$el.appendTo(app.views.main.$el);
	app.views.article.$el.appendTo(app.views.main.$el);
	app.views.pdfjs.$el.appendTo(app.views.main.$el);

	app.views.annotations.$el.prependTo("footer");

	app.views.sidebar.$el.show();

	app.models.article.set({
		title: "Extracting...",
		abstract: "",
		creators: [],
	});
});

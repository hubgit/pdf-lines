/*jshint browser: true, newcap: true, nomen: false, plusplus: false, undef: true, white: false */
/*global $, app, console, alert, FileReader, Backbone, Templates, _, PDFJS, XRegExp, TextLayerBuilder, DEBUG */

var Views = {
	Sidebar: Backbone.View.extend({
		tagName: "div",

		attributes: {
			"class": "sidebar",
		},

		events: {
			"click a": "select"
		},

		initialize: function() {
			this.render();
		},

		render: function() {
			this.$el.html(Templates.Sidebar());
		},

		select: function(event) {
			event.preventDefault();
			$(event.currentTarget).addClass("active").siblings(".active").removeClass("active");
			app.views.main.showSection(event.currentTarget.hash);
		}
	}),

	Main: Backbone.View.extend({
		tagName: "div",

		attributes: {
			"class": "main",
		},

		showSection: function(section) {
			this.$(section).addClass("active").siblings(".active").removeClass("active");
		}
	}),

	Input: Backbone.View.extend({
		tagName: "div",

		attributes: {
			"class": "section",
		},

		initialize: function() {
			this.render();
		},

		render: function() {
			this.$el.html(Templates.Input());
			this.$el.find("input[type=submit]").hide();
			this.listen();

			return this;
		},

		stop: function(event) {
			event.stopPropagation();
			event.preventDefault();
		},

		listen: function() {
			this.$("input[name=document]")
			.bind("dragover", this.stop)
			.bind("dragenter", this.stop)
			.bind("drop", _.bind(this.receive, this))
			.bind("change", _.bind(this.change, this));
		},

		receive: function(event) {
			this.stop(event);
			this.handleFiles(event.dataTransfer.files);
		},

		change: function(event) {
			this.handleFiles(event.target.files);
		},

		handleFiles: function(files) {
			var file = files[0];

			if (!file.type.match(/pdf$/)) {
				return alert("This demo only receives PDF files.");
			}

			this.$el.hide();

			app.views.sidebar.$el.show();
			app.views.sidebar.$("a[href=#article]").click();

			app.models.article.set("file", file);
			app.models.article.set("fileURL", window.URL.createObjectURL(file));
		}
	}),

	Lines: Backbone.View.extend({
		tagName: "article",

		attributes: {
			"vocab": "http://schema.org/",
			"typeof": "MedicalScholarlyArticle",
			"class": "section",
		},

		initialize: function() {
			//this.collection.on("change", this.render, this);
		},

		render: function() {
			var data = this.model.toJSON();
			this.$el.html(Templates.Article(data));

			this.$(".sortable").sortable();

			return this;
		}
	}),

	PDF: Backbone.View.extend({
		tagName: "iframe",

		attributes: {
			"name": "reader",
			"mozallowfullscreen": "true",
			"class": "section"
		},

		initialize: function() {
			this.model.on("change", this.render, this);
		},

		render: function() {
			this.$el.attr("src", this.model.get("fileURL"));
		}
	}),

	PDFJS: Backbone.View.extend({
		attributes: {
			"class": "section",
		},

		initialize: function() {
			this.model.on("change:file", this.fileChanged, this);
		},

		fileChanged: function(model) {
			var renderer = new Renderer(this);
			var reader = new FileReader();

			reader.onload = function(event) {
				PDFJS.getDocument(event.target.result).then(renderer.render);
			}

			reader.readAsArrayBuffer(model.get("file"));
		}
	}),

	Meta: Backbone.View.extend({
		tagName: "article",

		attributes: {
			"vocab": "http://schema.org/",
			"typeof": "MedicalScholarlyArticle",
			"class": "section",
		},

		initialize: function() {
			this.model.on("change", this.render, this);
		},

		render: function() {
			var data = this.model.toJSON();
			this.$el.html(Templates.Meta(data));

			return this;
		}
	}),

	Article: Backbone.View.extend({
		tagName: "article",

		id: "article",

		className: "section",

		events: {
			"click .line": "showAnnotationForm",
			"mouseover .line.annotated": "showAnnotations",
			"mouseout .line.annotated": "hideAnnotations",
		},

		initialize: function() {
			this.model.bind("change:html", this.render, this);
			this.annotationForm = this.createAnnotationForm().appendTo("footer");
			$(window).on("resize", $.debounce(10, this.scaleTextLayers));
		},

		render: function() {
			this.$el.html(this.model.get("html"));

			var height = 1582;
			$(".page").attr("height", height).height(height);

			this.sortLines();
			this.addLineNumbers();

			$(".pageContainer,.page").css({ maxWidth: "100%", height: "auto" });
			window.setTimeout(this.scaleTextLayers, 10); // needs a timeout or else the page won't have a height yet
			//$("#save").show();
		},

		scaleTextLayers: function() {
			$(".page").each(function(){
				var page = $(this);
				var scale = page.height() / page.attr("height");
				page.siblings(".textLayer").css("-webkit-transform", "scale(" + scale + "," + scale + ")");
			});
		},

		sortLines: function() {
			this.$(".textLayer > div").each(function(index, node) {
				var bounds = node.getBoundingClientRect();
				$(node).attr("data-top", bounds.top);
			});

			this.$(".textLayer > div").tsort({ order: "asc", attr: "data-top" });
		},

		addLineNumbers: function() {
			var bottom = 0;
			var i = 0;

			this.$(".textLayer > div").each(function(index, node) {
				var bounds = node.getBoundingClientRect();

				if (bounds.top <= bottom) {
					node.parentNode.removeChild(node);
					return true;
				}

				var $node = $(node);

				var height = bounds.bottom - bounds.top;
				bottom = bounds.bottom - (height / 3);

				i++;

				$node
					.empty()
					.addClass("line")
					.data("line", i)
					.attr("id", "line-" + i)
					.css("line-height", height + "px");
			});
		},

		unsetAnnotating: function() {
			this.$(".line.annotating").removeClass("annotating");
		},

		showAnnotationForm: function(event) {
			this.unsetAnnotating();

			var node = $(event.currentTarget);
			node.addClass("annotating");

			var line = node.data("line");

			this.annotationForm.find("input[name=line]").val(line);
			this.annotationForm.find("input[name=link]").val(window.location.href.replace(/#.*/, "") + "#line-" + line);

			this.annotationForm.hide().slideDown("fast");
			this.annotationForm.find("textarea").focus();

			this.showAnnotationsForLine(line);
		},

		showAnnotations: function(event) {
			if (this.annotationForm.is(":visible")) {
				return;
			}

			var line = $(event.currentTarget).data("line");
			this.showAnnotationsForLine(line);
		},

		showAnnotationsForLine: function(line) {
			var lines = app.views.annotations.$el.find(".annotation").hide().filter(".line-" + line).show();

			app.views.annotations.$el.show();
		},

		hideAnnotations: function(event) {
			if (this.$(".line.annotating").length) {
				return;
			}

			app.views.annotations.$el.hide();
		},

		hideAnnotationForm: function(event) {
			$(event.target).closest("form").hide();
			app.views.article.$(".line.annotating").removeClass("annotating");
		},

		saveAnnotation: function(event) {
			event.preventDefault();

			var form = $(event.currentTarget);

			// prevent accidental form submission
			// TODO: there might be a better way to unfocus the form
			if (!form.is(":visible")) {
				return;
			}

			var line = form.find("*[name=line]").val();

			var annotation = {
				token: location.hash.replace(/^#/, ""),
				comment: form.find("*[name=comment]").val(),
				line: Number(line)
			};

			app.collections.annotations.add(annotation);

			$("#line-" + line).addClass("annotated");

			form.hide();
			form.find("*[name=comment]").val("");

			app.views.article.unsetAnnotating();
		},

		createAnnotationForm: function() {
			//var handle = $("<div/>").addClass("handle");

			var link = $("<input/>", { name: "link", type: "text" }).prop("disabled", true);

			var comment = $("<textarea/>", { name: "comment" });
			var line = $("<input/>", { name: "line", type: "hidden" });

			var close = $("<input/>", { type: "button" }).addClass("close").val("Close");
			var submit = $("<input/>", { type: "submit" }).val("Save");
			var buttons = $("<div/>").addClass("buttons").append(submit).append(close);

			return $("<form/>")
				.addClass("annotation-input")
				//.append(handle)
				.append(link)
				.append(comment)
				.append(line)
				.append(buttons)
				.on("click", ".close", this.hideAnnotationForm)
				.on("submit", this.saveAnnotation)
				//.on("mousedown", ".handle", this.drag);
		},

		drag: function(event) {
			event.preventDefault();
	        event.stopPropagation();

	        var form = $(event.currentTarget).closest("form");

	        var offset = form.offset();

	        var offsetX = event.pageX - offset.left;
	        var offsetY = event.pageY - offset.top;

	        function move(event) {
	        	form.css({
	        		top: (event.pageY - offsetY) + 'px',
	        		left: (event.pageX - offsetX) + 'px'
	        	});
	        }

	        function stop(event) {
	            // remove the event listeners on the document when not dragging
	            document.removeEventListener('mousemove', move);
	            document.removeEventListener('mouseup', stop)
	        }

	        document.addEventListener('mousemove', move)
	        document.addEventListener('mouseup', stop)
		}
	}),

	Annotation: Backbone.View.extend({
		className: "annotation",

		events: {
			"click .delete": "deleteAnnotation"
		},

		initialize: function() {
			this.model.bind("change", this.render, this);
		},

		render: function() {
			var data = this.model.toJSON();
			this.$el.html(Templates.Annotation(data));
			this.$el.addClass("line-" + data.line);
			return this.$el;
		},

		deleteAnnotation: function(event) {
			event.preventDefault();
			event.stopPropagation();

			var line = this.model.get("line");

			app.collections.annotations.remove(this.model);
			this.$el.remove();

			// remove "annotated" class from line
			var lines = app.views.annotations.$el.find(".annotation").filter(".line-" + line);

			if (!lines.length) {
				$("#line-" + line).removeClass("annotated");
			}
		}
	}),

	Annotations: Backbone.View.extend({
		id: "annotations",

		initialize: function() {
			this.collection.bind("reset", this.render, this);
			this.collection.bind("add", this.add, this);
			this.render();
		},

		add: function(model) {
			var view = new Views.Annotation({ model: model });
			view.render().appendTo(this.$el);
		},

		render: function() {
			this.collection.each(this.add);
		},
	})
};
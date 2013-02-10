/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */

var cy;

var CompartmentGraphWidget = new function()
{

  var self = this;

  this.init = function()
  {
      // id of Cytoscape Web container div
      var div_id = "#cyelement";

      var options = {
        ready: function(){
          console.log('cytoscape ready')
        },
        style: cytoscape.stylesheet()
          .selector("node")
              .css({
                "content": "data(label)",
                "shape": "data(shape)",
                "border-width": 1,
                "background-color": "data(color)", //#DDD",
                "border-color": "#555",
                "width": "mapData(node_count, 0, 2000, 5, 50)", //"data(node_count)",
                "height": "mapData(node_count, 0, 2000, 5, 50)"   // "data(node_count)"
              })
            .selector("edge")
              .css({
                "content": "data(label)",
                "width": "data(weight)", //mapData(weight, 0, 100, 10, 50)",
                "target-arrow-shape": "triangle",
                // "source-arrow-shape": "circle",
                "line-color": "#444",
                "opacity": 0.4,
                
              })
            .selector(":selected")
              .css({
                "background-color": "#000",
                "line-color": "#000",
                "source-arrow-color": "#000",
                "target-arrow-color": "#000",
                "text-opacity": 1.0
              })
            .selector(".ui-cytoscape-edgehandles-source")
              .css({
                "border-color": "#5CC2ED",
                "border-width": 3
              })
            .selector(".ui-cytoscape-edgehandles-target, node.ui-cytoscape-edgehandles-preview")
              .css({
                "background-color": "#444", //"#5CC2ED"
              })
            .selector("edge.ui-cytoscape-edgehandles-preview")
              .css({
                "line-color": "#5CC2ED"
              })
            .selector("node.ui-cytoscape-edgehandles-preview, node.intermediate")
              .css({
                "shape": "rectangle",
                "width": 15,
                "height": 15
              }),
      /* elements: {
          nodes: [
            { data: { id: 'foo' } }, // NB no group specified
            { data: { id: 'bar' } },
            {
                  data: { weight: 100 }, // elided id => autogenerated id 
                  position: {
                    x: 100,
                    y: 200
                  },
                  classes: 'className1 className2',
                  selected: true,
                  selectable: true,
                  locked: false,
                  grabbable: true
            },

          ],

          edges: [
            { data: { id: 'baz', source: 'foo', target: 'bar' } },
          ]
        }*/

      };
      $(div_id).cytoscape(options);
      cy = $(div_id).cytoscape("get");

  };

  this.updateGraph = function( data ) {


    for(var i = 0; i < data.nodes.length; i++) {
      data.nodes[i]['data']['color'] = WebGLApp.getColorOfSkeleton( parseInt(data.nodes[i]['data'].id));
    }

    // first remove all nodes
    cy.elements("node").remove();

    cy.add( data );
    console.log('data', data);

    // force arbor, does not work
    var options = {
      name: 'arbor',
      liveUpdate: true, // whether to show the layout as it's running
      ready: undefined, // callback on layoutready 
      stop: undefined, // callback on layoutstop
      maxSimulationTime: 4000, // max length in ms to run the layout
      fit: true, // fit to viewport
      padding: [ 50, 50, 50, 50 ], // top, right, bottom, left
      ungrabifyWhileSimulating: true, // so you can't drag nodes during layout

      // forces used by arbor (use arbor default on undefined)
      repulsion: undefined,
      stiffness: undefined,
      friction: undefined,
      gravity: true,
      fps: undefined,
      precision: undefined,

      // static numbers or functions that dynamically return what these
      // values should be for each element
      nodeMass: undefined, 
      edgeLength: undefined,

      stepSize: 1, // size of timestep in simulation

      // function that returns true if the system is stable to indicate
      // that the layout can be stopped
      stableEnergy: function( energy ){
          var e = energy; 
          return (e.max <= 0.5) || (e.mean <= 0.3);
      },
      stop: function() {
        console.log('layout stop');
      },
    };

    // grid
    var options = {
      name: 'grid',
      fit: true, // whether to fit the viewport to the graph
      rows: undefined, // force num of rows in the grid
      columns: undefined, // force num of cols in the grid
      ready: undefined, // callback on layoutready
      stop: undefined // callback on layoutstop
      };

    cy.layout( options );

    cy.nodes().bind("mouseover", function(e) {
      // console.log('node mouseover', e);
    });

  }

  this.updateGraphFrom3DViewer = function() {
    jQuery.ajax({
      url: "dj/" + project.id + "/skeletongroup/skeletonlist_compartment_subgraph",
      type: "POST",
      dataType: "json",
      data: { 
        skeleton_list: WebGLApp.getListOfSkeletonIDs(true),
        confidence_threshold: $('#confidence_threshold').val()
         },
      success: function (data) {
        console.log('received data', data);
        self.updateGraph( data );

      }
    });
  }

};

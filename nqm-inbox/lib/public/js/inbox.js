/**
 * Created by toby on 19/10/15.
 */

//var data = [
//  {id:1, folder:1, name: "Alex Stern", email: "alex@spam.com", subject:"Invitation", date: "25/07/2013 12:30:20"},
//  {id:2, folder:1, name: "Sofia O'Neal", email: "sofia@spam.com", subject:"Report", date: "25/07/2013 16:10:07"},
//  {id:3, folder:1, name: "Jacob Erickson", email: "jacob@spam.com", subject:"Go ahead, make my day", date: "26/07/2013 11:25:50"},
//  {id:4, folder:1, name: "Alice", email: "alice@spam.com", subject:"Confirmation request", date: "26/07/2013 15:28:46"},
//  {id:6, folder:1, name: "Sofia O'Neal", email: "sofia@spam.com", subject:"Re: Details for Ticket 256", date: "30/07/2013 17:10:17"},
//  {id:5, folder:1, name: "Alex Stern", email: "alex@spam.com", subject:"Requested info", date: "30/07/2013 12:58:20"},
//  {id:7, folder:1, name: "Jacob Erickson", email: "jacob@spam.com", subject:"Urgent", date: "28/07/2013 09:02:11"},
//  {id:11, folder:2, name: "Alex Stern", email: "alex@spam.com", subject:"Re: Forecast", date: "25/07/2013 14:10:45"},
//  {id:12, folder:2, name: "Sofia O'Neal", email: "sofia@spam.com", subject:"Party invitation", date: "25/07/2013 17:05:10"}
//];

var ui = { rows:[
  {
    type: "space",
    rows:[
      {
        view: "toolbar", height: 45, elements:[
        {view: "label", label: "<span style='font-size: 18px;'>SECD Email Manager</span>"}
      ]
      },
      {
        type:"wide", cols:[
        {
          type: "clean",
          rows:[
            { view:"button", id: "id_create", type: "iconButton", label:"Create", icon:"envelope", width: 95 },
            {
              view:"tree",
              css: "rounded_top",
              select: true,
              width:280,
              type:{
                folder:function(obj){
                  return "<img src='common/tree/"+obj.icon+".png' style='position:relative; top:2px; left:-2px;'>";
                }
              },
              data:[
                { id:"1", value:"Inbox", icon:"inbox"},
                { id:"2", value:"Sent", icon:"sent"},
                { id:"3", value:"Drafts", icon:"drafts"},
                { id:"4", value:"Trash", icon:"trash"},
                { id:"5", value:"Contact Groups", open:true, icon:"folder", data:[
                  { id:"5-1", value:"Friends", icon:"file"},
                  { id:"5-2", value:"Blocked", icon:"file"}
                ]
                }
              ]
            },
            {
              view: "calendar", css: "rounded_bottom"
            }
          ]
          
        },
        { type:"wide",rows:[
          { view:"datatable", css: "rounded_top", scrollX:false, columns:[
            { id:"checked", header:{ content:"masterCheckbox" }, template:"{common.checkbox()}", width: 40 },
            { id:"id", width: 100, header:"Id" },
            { id:"from", width: 250, header:"From" },
            { id:"subject", header:"Subject", fillspace:true },
            { id:"date", header:"Date", width: 150 }
          ], select:"row", data: data, ready:function(){
            //webix.delay(function(){
            this.select(1);
            //},this);
          }},
          { height: 45, cols:[
            { view:"button", id: "id_reply", type: "icon",  label:"Reply", icon:"reply", width: 95, hidden: true},
            { view:"button", id: "id_replyall", type: "icon", label:"Reply All", icon:"reply-all", width: 100, hidden: false },
            { view:"button", id: "id_delete", type: "icon", label:"Delete", icon:"times", width: 95 },
            {},
            { view:"button", id: "id_prev", type: "icon", icon: "angle-double-left", width: 30 },
            { view:"button", id: "id_next", type: "icon", icon: "angle-double-right", width: 30 }
          ]},
			{view:"template", id: "mailview", scroll:"y", template:"No message available"}
        ]}
      ]
        
        
      }
    ]
  }
]};

webix.ready(function() {

	webix.ui(ui);

	$$("$datatable1").bind($$("$tree1"),function(obj,filter){
		return obj.folder == filter.id;
	});

	$$("$datatable1").attachEvent("onAfterSelect",function(id){
		webix.ajax("/message?id="+data[this.getItem(id).id].msgid, function(text) {
    		$$("id_reply").show();
    		$$("mailview").setHTML(text);
		});
  	});

	$$("id_prev").attachEvent("onItemClick", function(id, e){
    	webix.ajax("/page?id="+data[$$("$datatable1").getSelectedId().id].prevpage, function(text) {
			console.log(text);
		});
	});

	$$("id_next").attachEvent("onItemClick", function(id, e){
        webix.ajax("/page?id="+data[$$("$datatable1").getSelectedId().id].nextpage, function(text) {
            console.log(text);
        });	
	});

	$$("$tree1").select(1);

});

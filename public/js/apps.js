/**
 * Created by toby on 16/10/15.
 */

var activeItem;

function showAppDetails(bind, propertySheet) {
  var elements = [
    {label: "appId", type: "text", id: "appId"},
    {label: "params", type:"text", id: "params"},
    {label: "name", type: "text", id: "name"},
    {label: "appUrl", type: "text", id: "appUrl"},
    {label: "status", type: "text", id: "status"}
  ];
  propertySheet.define("elements",elements);
  propertySheet.parse(bind);
  
  $$("install").hide();
  $$("run").hide();
  $$("uninstall").hide();
  $$("stop").hide();
  
  switch (bind.status) {
    case "pendingInstall":
      $$("install").show();
      break;
    case "stopped":
      $$("run").show();
      $$("uninstall").show();
      break;
    case "running":
      $$("stop").show();
      break;
    default: 
      break;
  }
}

function onDataNotify(evt) {
  if (activeItem && evt && evt.data.id === activeItem.id) {
    appListClick(activeItem,$$("appDetailsData"));
  }
}

function onSetStatus(status) {
  if (!activeItem) {
    console.log("onSetStatus - no active item");
  } else {
    _ddp.call("setAppStatus",status,activeItem,function(err, result) {
      if (err) {
        console.log("error: " + err.message);
      } else {
        console.log("result: " + result);
      }
    });
  }
}

function appListClick(item, propertySheet) {
  activeItem = item;
  
  var bind = {
    appId: item.appId,
    params: item.params,
    name: item.name,
    appUrl: item.appURL,
    status: item.status
  };
  showAppDetails(bind, propertySheet);
}

var contentUI = {
  type: "space",
  cols: [
    {
      header: "notifications",
      collapsed: true,
      body: {
        rows: [
          { view: "label", template: "<div>nick allott requests access to file-system.read</div>" },
          { view: "label", template: "<div>nick allott requests access to front-room.temperature</div>" },
          {}
        ]
      }
    },
    {
      view: "scrollview",
      scroll: "y",
      body: {
        rows: [
          {
            id:        "appsTabBar",
            view:      "tabview",
            tabbar:    {optionWidth: 100},
            multiview: {animate: true},
            gravity:   1,
            cells:     [
              {
                header: "apps",
                body:   {
                  id:       "runningList",
                  view:     "list",
                  minHeight: 100,
                  autoheight: true,
                  template: "#name#",
                  css: "secd-apps-list",
                  url:      webix.proxy("ddp", "data-NJxAJbJ8ge")
                }
              },
              {
                header: "config",
                body:   {template: "configuration"}
              },
              {
                header: "databases",
                body:   {template: "application databases"}
              }
            ]
          },
          {
            id:      "detailsContainer",
            gravity: 1,
            rows:    [
              {
                id:     "appDetailsContainer",
                header: "details",
                body:   {
                  rows: [
                    {
                      id:       "appDetailsData",
                      view:     "property",
                      autoheight: true,
                      elements: []
                    },
                    {
                      id:     "install",
                      view:   "button",
                      type:   "iconButton",
                      icon:   "download",
                      label:  "install",
                      hidden: true,
                      click: onSetStatus
                    },
                    {id: "run", view: "button", type: "iconButton", icon: "play", label: "run", hidden: true, click: onSetStatus },
                    {id: "stop", view: "button", type: "iconButton", icon: "stop", label: "stop", hidden: true, click: onSetStatus },
                    {
                      id:     "uninstall",
                      view:   "button",
                      type:   "iconButton",
                      icon:   "trash-o",
                      label:  "uninstall",
                      hidden: true,
                      click: onSetStatus
                    },
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]};

webix.ready(function() {
  secdEventBus.addListener(/data-*/, onDataNotify);
  
  $$("runningList").attachEvent("onItemClick", function(id) {
      var item = this.getItem(id);
      appListClick(item, $$("appDetailsData"));
    });
});

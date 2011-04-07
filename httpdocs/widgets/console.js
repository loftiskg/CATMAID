/* -*- mode: espresso; espresso-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */

function Console()
{
  var view = document.createElement("div");
  view.className = "console";
  view.appendChild(document.createElement("pre"));

  var spinnerDiv = document.createElement("div");
  spinnerDiv.setAttribute('id','spinner');
  var spinnerImg = document.createElement("img");
  spinnerImg.setAttribute('src', 'widgets/themes/kde/ajax-loader.gif');
  spinnerDiv.appendChild(spinnerImg);
  view.appendChild(spinnerDiv);

  var toStr = function (obj, ins)
  {
    if (typeof ins == "undefined") ins = "";

    var type = typeof(obj);
    var str = "[" + type + "] ";

    switch (type)
    {
    case "function":
    case "object":
      if (ins.length <= 6)
      {
        str += "\r\n";
        for (var key in obj)
        {
          str += ins + "\"" + key + "\" => " + toStr(obj[key], ins + "  ") + "\r\n";
        }
      }
      else str += "..."
      break;
    case "undefined":
      break;
    default:
      str += obj;
      break;
    }
    return str;
  }

  this.print = function (obj)
  {
    if (typeof obj == "string") view.lastChild.appendChild(document.createTextNode(obj));
    else
    view.lastChild.appendChild(document.createTextNode(toStr(obj)));
    return;
  }

  this.println = function (obj)
  {
    var sp = document.createElement("pre");
    if (typeof obj == "string") sp.appendChild(document.createTextNode(obj));
    else
    sp.appendChild(document.createTextNode(toStr(obj)));
    view.appendChild(sp);
    return;
  }

  this.replaceLast = function (obj)
  {
    var sp = document.createElement("pre");
    if (typeof obj == "string") sp.appendChild(document.createTextNode(obj));
    else
    sp.appendChild(document.createTextNode(toStr(obj)));
    view.replaceChild(sp, view.firstChild);
    return;
  }

  this.getView = function ()
  {
    return view;
  }
}

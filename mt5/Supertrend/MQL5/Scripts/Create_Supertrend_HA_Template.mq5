// Creates a chart template through MetaTrader itself; no trading operations.
#property script_show_inputs
#property strict
input string TemplateName="SupertrendHA_Research.tpl";
void OnStart() {
   if(TemplateName=="" || StringFind(TemplateName,"/")>=0 || StringFind(TemplateName,"\\")>=0 || StringFind(TemplateName,"..")>=0) {
      Print("Use a simple template filename."); return;
   }
   ResetLastError();
   if(ChartSaveTemplate(0,TemplateName)) Print("Template saved: ",TemplateName,". Attach the desired Heiken Ashi indicator BEFORE running this script.");
   else Print("Template save failed. Error ",GetLastError());
}

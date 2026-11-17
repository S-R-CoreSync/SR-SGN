' SGN - تشغيل الخادم المحلي على المنفذ 3000
' ملاحظة: نستخدم node مباشرة لأن مسار المشروع يحتوي على الرمز & الذي يكسر npm run dev
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
WshShell.CurrentDirectory = projectRoot
WshShell.Run "cmd /c node ""node_modules\next\dist\bin\next"" dev -p 3000 --webpack", 1, False
WScript.Sleep 8000
WshShell.Run "http://localhost:3000", 1, False

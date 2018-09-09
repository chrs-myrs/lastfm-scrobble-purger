[CmdletBinding()]
Param(
  [Parameter(Mandatory=$True,Position=1)]
   [string]$lambdaName,
	
   [Parameter(Mandatory=$False)]
   [boolean]$jsOnly,

   [Parameter(Mandatory=$False)]
   [boolean]$dryRun
)

#$7zipPath = 'C:\Users\Admin\Portable Apps\7-Zip\App\7-Zip64\7z.exe'

Push-Location $PSScriptRoot
[Environment]::CurrentDirectory = $PWD

if(-not ($jsOnly -and (Test-Path  .\$lambdaName.zip))) {
    Write-Output "Running Full Bulid"
    If (Test-Path .\$lambdaName.zip){
        Remove-Item .\$lambdaName.zip
    }
    if (Test-Path ..\lambda_source) {
        #& $7zipPath a .\$lambdaName.zip ..\lambda_source\*
        Compress-Archive -DestinationPath .\$lambdaName -Path ..\lambda_source
    } else {
        #& $7zipPath a .\$lambdaName.zip ..\node_modules\
        Compress-Archive -DestinationPath .\$lambdaName -Path ..\node_modules
    }
} else {
    Write-Output "Running Quick Bulid"
}

Compress-Archive -DestinationPath .\$lambdaName -Path ..\*.js,..\*.yml,..\*.json -Update
#& $7zipPath u .\$lambdaName.zip ..\*.js ..\*.yml ..\*.json

if ($dryRun) {
    Write-Output "Uploading code...."
    aws lambda update-function-code --function-name $lambdaName --zip-file fileb://$lambdaName.zip --dry-run
} else {
    Write-Output "Uploading code...."
    aws lambda update-function-code --function-name $lambdaName --zip-file fileb://$lambdaName.zip --publish
}


Write-Output "Deployment finished."

Pop-Location
[Environment]::CurrentDirectory = $PWD
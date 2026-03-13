targetScope = 'resourceGroup'

@description('Azure region for AVD resources.')
param location string = resourceGroup().location

@description('Workspace name.')
param workspaceName string = 'wksp-ashik-avd-centralindia'

@description('Host pool name for Arbeet.')
param arbeetHostPoolName string = 'hp-arbeet-dev'

@description('Host pool name for Niraj.')
param nirajHostPoolName string = 'hp-niraj-gpu'

@description('Desktop application group name for Arbeet.')
param arbeetAppGroupName string = 'dag-arbeet-dev'

@description('Desktop application group name for Niraj.')
param nirajAppGroupName string = 'dag-niraj-gpu'

@description('Scaling plan name shared by both personal host pools.')
param scalingPlanName string = 'sp-avd-personal-costsafe'

@description('Windows timezone for Nepal. Keep this as Nepal Standard Time.')
param avdTimeZone string = 'Nepal Standard Time'

@description('Object ID of Arbeet user in Entra ID.')
param arbeetUserObjectId string

@description('Object ID of Niraj user in Entra ID.')
param nirajUserObjectId string

@description('Object ID of the AVD service principal that needs power management permissions for Start VM on Connect.')
param avdPowerServicePrincipalObjectId string

@description('VM names in Arbeet host pool. Personal pool should usually have one VM.')
param arbeetSessionHostVmNames array

@description('VM names in Niraj host pool. Personal pool should usually have one VM.')
param nirajSessionHostVmNames array


@description('Optional tags.')
param tags object = {
  workload: 'avd'
  env: 'prod'
  costProfile: 'optimized'
}

var allSessionHostVmNames = concat(arbeetSessionHostVmNames, nirajSessionHostVmNames)
var disconnectedTimeoutCommand = 'powershell -ExecutionPolicy Bypass -EncodedCommand JABrAD0AJwBIAEsATABNADoAXABTAE8ARgBUAFcAQQBSAEUAXABQAG8AbABpAGMAaQBlAHMAXABNAGkAYwByAG8AcwBvAGYAdABcAFcAaQBuAGQAbwB3AHMAIABOAFQAXABUAGUAcgBtAGkAbgBhAGwAIABTAGUAcgB2AGkAYwBlAHMAJwA7AE4AZQB3AC0ASQB0AGUAbQAgAC0AUABhAHQAaAAgACQAawAgAC0ARgBvAHIAYwBlACAAfAAgAE8AdQB0AC0ATgB1AGwAbAA7AFMAZQB0AC0ASQB0AGUAbQBQAHIAbwBwAGUAcgB0AHkAIAAtAFAAYQB0AGgAIAAkAGsAIAAtAE4AYQBtAGUAIABNAGEAeABEAGkAcwBjAG8AbgBuAGUAYwB0AGkAbwBuAFQAaQBtAGUAIAAtAFQAeQBwAGUAIABEAFcAbwByAGQAIAAtAFYAYQBsAHUAZQAgADEAMAA4ADAAMAAwADAAMAA7AGcAcAB1AHAAZABhAHQAZQAgAC8AdABhAHIAZwBlAHQAOgBjAG8AbQBwAHUAdABlAHIAIAAvAGYAbwByAGMAZQA='

var desktopVirtualizationUserRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '1d336d2c-4ae8-42ef-9711-b3604ce3fc2c')
var powerOnOffRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '40c5ff49-9181-41f8-ae61-143b0e78555e')

resource workspace 'Microsoft.DesktopVirtualization/workspaces@2024-04-03' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    friendlyName: workspaceName
    description: 'Workspace for Arbeet and Niraj personal desktops'
    publicNetworkAccess: 'Enabled'
    applicationGroupReferences: [
      arbeetAppGroup.id
      nirajAppGroup.id
    ]
  }
}

resource arbeetHostPool 'Microsoft.DesktopVirtualization/hostPools@2024-04-03' = {
  name: arbeetHostPoolName
  location: location
  tags: tags
  properties: {
    hostPoolType: 'Personal'
    personalDesktopAssignmentType: 'Automatic'
    loadBalancerType: 'Persistent'
    preferredAppGroupType: 'Desktop'
    maxSessionLimit: 1
    startVMOnConnect: true
    validationEnvironment: false
    friendlyName: 'Arbeet Dev Personal Host Pool'
    description: 'Personal host pool for Arbeet dev work'
    customRdpProperty: 'targetisaadjoined:i:1;enablerdsaadauth:i:1;redirectclipboard:i:1;redirectprinters:i:1;redirectcomports:i:0;redirectsmartcards:i:1;drivestoredirect:s:;audiocapturemode:i:1;audiomode:i:0;'
  }
}

resource nirajHostPool 'Microsoft.DesktopVirtualization/hostPools@2024-04-03' = {
  name: nirajHostPoolName
  location: location
  tags: tags
  properties: {
    hostPoolType: 'Personal'
    personalDesktopAssignmentType: 'Automatic'
    loadBalancerType: 'Persistent'
    preferredAppGroupType: 'Desktop'
    maxSessionLimit: 1
    startVMOnConnect: true
    validationEnvironment: false
    friendlyName: 'Niraj GPU Personal Host Pool'
    description: 'Personal host pool for Niraj Adobe workflows'
    customRdpProperty: 'targetisaadjoined:i:1;enablerdsaadauth:i:1;redirectclipboard:i:1;redirectprinters:i:1;redirectcomports:i:0;redirectsmartcards:i:1;drivestoredirect:s:;audiocapturemode:i:1;audiomode:i:0;'
  }
}

resource arbeetAppGroup 'Microsoft.DesktopVirtualization/applicationGroups@2024-04-03' = {
  name: arbeetAppGroupName
  location: location
  tags: tags
  properties: {
    applicationGroupType: 'Desktop'
    hostPoolArmPath: arbeetHostPool.id
    friendlyName: 'Arbeet Desktop App Group'
    description: 'Desktop assignment for Arbeet'
    showInFeed: true
  }
}

resource nirajAppGroup 'Microsoft.DesktopVirtualization/applicationGroups@2024-04-03' = {
  name: nirajAppGroupName
  location: location
  tags: tags
  properties: {
    applicationGroupType: 'Desktop'
    hostPoolArmPath: nirajHostPool.id
    friendlyName: 'Niraj Desktop App Group'
    description: 'Desktop assignment for Niraj'
    showInFeed: true
  }
}

resource scalingPlan 'Microsoft.DesktopVirtualization/scalingPlans@2024-04-08-preview' = {
  name: scalingPlanName
  location: location
  tags: tags
  properties: {
    friendlyName: 'Personal desktop cost-optimized plan'
    description: '24x7 start-on-connect + stop when no sessions'
    timeZone: avdTimeZone
    hostPoolType: 'Personal'
    exclusionTag: 'DoNotScale'
    hostPoolReferences: [
      {
        hostPoolArmPath: arbeetHostPool.id
        scalingPlanEnabled: true
      }
      {
        hostPoolArmPath: nirajHostPool.id
        scalingPlanEnabled: true
      }
    ]
    schedules: [
      {
        name: 'always-on-demand'
        daysOfWeek: [
          'Monday'
          'Tuesday'
          'Wednesday'
          'Thursday'
          'Friday'
          'Saturday'
          'Sunday'
        ]
        rampUpStartTime: {
          hour: 0
          minute: 0
        }
        peakStartTime: {
          hour: 0
          minute: 15
        }
        rampDownStartTime: {
          hour: 0
          minute: 30
        }
        offPeakStartTime: {
          hour: 23
          minute: 59
        }
        rampUpLoadBalancingAlgorithm: 'DepthFirst'
        peakLoadBalancingAlgorithm: 'DepthFirst'
        rampDownLoadBalancingAlgorithm: 'DepthFirst'
        offPeakLoadBalancingAlgorithm: 'DepthFirst'
        rampUpMinimumHostsPct: 0
        rampUpCapacityThresholdPct: 1
        rampDownMinimumHostsPct: 0
        rampDownCapacityThresholdPct: 1
        rampDownStopHostsWhen: 'ZeroSessions'
        rampDownForceLogoffUsers: false
        rampDownWaitTimeMinutes: 30
        rampDownNotificationMessage: 'Session host is set to auto-stop when no sessions remain. Please save your work before disconnecting.'
      }
    ]
  }
}

resource arbeetUserAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(arbeetAppGroup.id, arbeetUserObjectId, desktopVirtualizationUserRoleDefinitionId)
  scope: arbeetAppGroup
  properties: {
    principalId: arbeetUserObjectId
    roleDefinitionId: desktopVirtualizationUserRoleDefinitionId
    principalType: 'User'
  }
}

resource nirajUserAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(nirajAppGroup.id, nirajUserObjectId, desktopVirtualizationUserRoleDefinitionId)
  scope: nirajAppGroup
  properties: {
    principalId: nirajUserObjectId
    roleDefinitionId: desktopVirtualizationUserRoleDefinitionId
    principalType: 'User'
  }
}

resource avdPowerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, avdPowerServicePrincipalObjectId, powerOnOffRoleDefinitionId)
  properties: {
    principalId: avdPowerServicePrincipalObjectId
    roleDefinitionId: powerOnOffRoleDefinitionId
    principalType: 'ServicePrincipal'
  }
}

resource sessionTimeoutPolicy 'Microsoft.Compute/virtualMachines/extensions@2023-09-01' = [for vmName in allSessionHostVmNames: {
  name: '${vmName}/avd-disconnected-timeout'
  location: location
  properties: {
    publisher: 'Microsoft.Compute'
    type: 'CustomScriptExtension'
    typeHandlerVersion: '1.10'
    autoUpgradeMinorVersion: true
    settings: {}
    protectedSettings: {
      commandToExecute: disconnectedTimeoutCommand
    }
  }
}]

output workspaceResourceId string = workspace.id
output arbeetHostPoolResourceId string = arbeetHostPool.id
output nirajHostPoolResourceId string = nirajHostPool.id
output scalingPlanResourceId string = scalingPlan.id
output importantNote string = 'This template enforces Start VM on Connect + scaling plan stop on zero sessions and sets disconnected session timeout to 180 minutes.'

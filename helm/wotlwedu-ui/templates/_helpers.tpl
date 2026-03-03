{{- define "wotlwedu-ui.labels" -}}
app.kubernetes.io/name: {{ include "wotlwedu-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- with .Chart.AppVersion }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "wotlwedu-ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "wotlwedu-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "wotlwedu-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "wotlwedu-ui.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "wotlwedu-ui.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

package com.energen.mobileapp.zoho.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Equipment verification data model for Zoho Creator submission
 * Maps to Zoho Creator form fields for field equipment verification workflow
 */
@Serializable
data class EquipmentVerification(
    @SerialName("equipment_id")
    val equipmentId: String? = null,

    @SerialName("manufacturer")
    val manufacturer: String,

    @SerialName("model_number")
    val modelNumber: String,

    @SerialName("serial_number")
    val serialNumber: String,

    @SerialName("kw_rating")
    val kwRating: String? = null,

    @SerialName("fuel_type")
    val fuelType: String? = null,

    @SerialName("voltage")
    val voltage: String? = null,

    @SerialName("battery_count")
    val batteryCount: Int? = null,

    @SerialName("battery_voltage")
    val batteryVoltage: String? = null,

    @SerialName("location_latitude")
    val latitude: Double,

    @SerialName("location_longitude")
    val longitude: Double,

    @SerialName("location_accuracy")
    val locationAccuracy: Float,

    @SerialName("verification_timestamp")
    val timestamp: String, // ISO-8601 format

    @SerialName("technician_name")
    val technicianName: String,

    @SerialName("technician_email")
    val technicianEmail: String,

    @SerialName("customer_site")
    val customerSite: String? = null,

    @SerialName("notes")
    val notes: String? = null,

    @SerialName("nameplate_photo_id")
    val nameplatePhotoId: String? = null,

    @SerialName("battery_photo_id")
    val batteryPhotoId: String? = null,

    @SerialName("parts_photo_ids")
    val partsPhotoIds: List<String>? = null,

    @SerialName("ai_extraction_confidence")
    val aiConfidence: Float? = null,

    @SerialName("manual_corrections")
    val manualCorrections: Boolean = false
)

/**
 * Photo with embedded GPS metadata
 */
@Serializable
data class PhotoWithMetadata(
    val photoUri: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: String,
    val captureType: PhotoCaptureType
)

enum class PhotoCaptureType {
    NAMEPLATE,
    BATTERY_BANK,
    PARTS,
    OTHER
}

/**
 * Zoho Creator API response for form submission
 */
@Serializable
data class ZohoCreatorResponse(
    @SerialName("code")
    val code: Int,

    @SerialName("message")
    val message: String,

    @SerialName("data")
    val data: ZohoCreatorResponseData? = null
)

@Serializable
data class ZohoCreatorResponseData(
    @SerialName("record_id")
    val recordId: String,

    @SerialName("created_time")
    val createdTime: String,

    @SerialName("modified_time")
    val modifiedTime: String
)

/**
 * Zoho Creator form schema response
 */
@Serializable
data class ZohoFormSchema(
    @SerialName("form_name")
    val formName: String,

    @SerialName("fields")
    val fields: List<ZohoFormField>
)

@Serializable
data class ZohoFormField(
    @SerialName("field_name")
    val fieldName: String,

    @SerialName("display_name")
    val displayName: String,

    @SerialName("field_type")
    val fieldType: String,

    @SerialName("mandatory")
    val mandatory: Boolean,

    @SerialName("choices")
    val choices: List<String>? = null
)

/**
 * Photo upload response from Zoho
 */
@Serializable
data class ZohoPhotoUploadResponse(
    @SerialName("code")
    val code: Int,

    @SerialName("message")
    val message: String,

    @SerialName("data")
    val data: ZohoPhotoData? = null
)

@Serializable
data class ZohoPhotoData(
    @SerialName("file_id")
    val fileId: String,

    @SerialName("file_url")
    val fileUrl: String
)

/**
 * Equipment verification workflow state
 */
sealed class VerificationWorkflowState {
    data object Idle : VerificationWorkflowState()
    data object CapturingNameplate : VerificationWorkflowState()
    data class PreviewingExtraction(val extractedData: Map<String, String>) : VerificationWorkflowState()
    data object CapturingBatteryBank : VerificationWorkflowState()
    data object CountingBatteries : VerificationWorkflowState()
    data object CapturingParts : VerificationWorkflowState()
    data object Submitting : VerificationWorkflowState()
    data class Success(val recordId: String) : VerificationWorkflowState()
    data class Error(val message: String) : VerificationWorkflowState()
}

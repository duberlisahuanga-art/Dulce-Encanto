<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class NotificationController extends Controller {
 public function index(Request $request):JsonResponse { $query=AppNotification::where('user_id',$request->user()->id); return response()->json(['data'=>(clone $query)->latest()->limit(30)->get(),'unread_count'=>(clone $query)->whereNull('read_at')->count()]); }
 public function read(Request $request,AppNotification $notification):JsonResponse { abort_unless($notification->user_id===$request->user()->id,404);$notification->update(['read_at'=>now()]);return response()->json(['data'=>$notification]); }
 public function readAll(Request $request):JsonResponse { AppNotification::where('user_id',$request->user()->id)->whereNull('read_at')->update(['read_at'=>now()]);return response()->json(['message'=>'Notificaciones marcadas como leídas.']); }
}

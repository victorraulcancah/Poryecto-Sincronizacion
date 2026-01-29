import { Directive, Input, type TemplateRef, type ViewContainerRef, type OnInit, type OnDestroy } from "@angular/core"
import type { PermissionsService } from "../services/permissions.service"
import type { Subscription } from "rxjs"

@Directive({
  selector: "[hasPermission]",
  standalone: true,
})
export class HasPermissionDirective {

  private permission = ""
  private permissionsSubscription?: Subscription

  @Input() set hasPermission(permission: string) {
    this.permission = permission
    this.updateView()
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionsService: PermissionsService,
  ) {}

  ngOnInit(): void {
    // Usar tu método hasPermissionRealTime existente
    this.permissionsSubscription = this.permissionsService
      .hasPermissionRealTime(this.permission)
      .subscribe((hasPermission) => {
        this.viewContainer.clear()
        if (hasPermission) {
          this.viewContainer.createEmbeddedView(this.templateRef)
        }
      })
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe()
    }
  }

  private updateView(): void {
    if (this.permission) {
      this.viewContainer.clear()
      if (this.permissionsService.hasPermission(this.permission)) {
        this.viewContainer.createEmbeddedView(this.templateRef)
      }
    }
  }

}

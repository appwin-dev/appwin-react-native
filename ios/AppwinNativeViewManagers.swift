import Foundation
import React
import SwiftUI
import UIKit
import AppwinCommunity
import AppwinSupport

/**
 Vues natives exposées à React Native.

 Le fil et le messenger existent en SwiftUI ; ces gestionnaires les emballent
 dans un `UIView` que React Native sait poser dans sa hiérarchie. Rien n'est
 réécrit : c'est le même écran que dans une app native.

 Un `UIHostingController` a besoin d'un parent pour que son cycle de vie soit
 correct - sans ça, les `onAppear` ne partent pas et les modales présentées
 depuis l'écran n'ont pas de présentateur. On le rattache donc au contrôleur
 qui possède la vue React, dès qu'elle entre dans la hiérarchie.
 */
final class AppwinHostingView: UIView {
  private var hostingController: UIHostingController<AnyView>?
  private let rootView: AnyView

  init(rootView: AnyView) {
    self.rootView = rootView
    super.init(frame: .zero)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError("init(coder:) n'est pas supporté") }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, hostingController == nil else { return }

    let controller = UIHostingController(rootView: rootView)
    controller.view.backgroundColor = .clear
    hostingController = controller

    if let parent = parentViewController {
      parent.addChild(controller)
      addSubview(controller.view)
      controller.didMove(toParent: parent)
    } else {
      addSubview(controller.view)
    }

    controller.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      controller.view.topAnchor.constraint(equalTo: topAnchor),
      controller.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      controller.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      controller.view.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
  }

  override func removeFromSuperview() {
    hostingController?.willMove(toParent: nil)
    hostingController?.removeFromParent()
    hostingController = nil
    super.removeFromSuperview()
  }

  private var parentViewController: UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }
}

@objc(AppwinCommunityViewManager)
final class AppwinCommunityViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  // `view()` is nonisolated, `communityView()` is MainActor-isolated.
  // `requiresMainQueueSetup` already guarantees we are on the main queue, so we
  // assert that to the compiler rather than hopping actors, which would make the
  // factory asynchronous when React Native expects it synchronous.
  override func view() -> UIView! {
    MainActor.assumeIsolated {
      AppwinHostingView(rootView: AppwinCommunity.communityView())
    }
  }
}

@objc(AppwinSupportMessengerViewManager)
final class AppwinSupportMessengerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  // See AppwinCommunityViewManager: same isolation, same reason.
  override func view() -> UIView! {
    MainActor.assumeIsolated {
      AppwinHostingView(rootView: AnyView(AppwinSupport.messengerView()))
    }
  }
}
